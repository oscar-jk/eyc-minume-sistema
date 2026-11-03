/**
 * Traductor mínimo de peticiones PostgREST a SQL, solo para el modo demostración.
 * Cubre lo que usa la app: select con filtros, orden y embebidos; insert/upsert; update; delete; rpc.
 * No hace red ni toca ninguna base real: el SQL corre en la base en memoria (ver motor.ts).
 */

export interface Relacion {
  tabla: string
  col: string
  ref: string
  refcol: string
}
export interface Funcion {
  retset: boolean
  /** 'b' base, 'c' compuesto, 'p' pseudo-tipo (returns table / record), 'v' void */
  tipo: string
}
export interface Catalogo {
  fks: Relacion[]
  funciones: Record<string, Funcion>
}

const RESERVADOS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])

export class ErrorPeticion extends Error {
  constructor(
    mensaje: string,
    public estado = 400,
    public codigo = 'PGRST100',
  ) {
    super(mensaje)
  }
}

function ident(n: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) throw new ErrorPeticion(`Nombre no válido: ${n}`)
  return `"${n}"`
}

/** Literal SQL. Los textos van como literales sin tipo para que Postgres los convierta al tipo de la columna. */
export function lit(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v) && v.every((x) => x === null || ['string', 'number', 'boolean'].includes(typeof x))) {
    const el = v.map((x) => (x === null ? 'NULL' : `"${String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`))
    return `'{${el.join(',').replace(/'/g, "''")}}'`
  }
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return `'${s.replace(/'/g, "''")}'`
}

/** Separa por comas de primer nivel (respeta paréntesis y comillas). */
function partir(s: string): string[] {
  const out: string[] = []
  let nivel = 0
  let comilla = false
  let actual = ''
  for (const c of s) {
    if (c === '"') comilla = !comilla
    if (!comilla) {
      if (c === '(') nivel++
      if (c === ')') nivel--
      if (c === ',' && nivel === 0) {
        out.push(actual)
        actual = ''
        continue
      }
    }
    actual += c
  }
  if (actual.trim()) out.push(actual)
  return out.map((x) => x.trim()).filter(Boolean)
}

let contador = 0

/** Lista de columnas de un select, con embebidos `alias:tabla(cols)`. `alias` es el alias SQL de la tabla actual. */
function columnas(sel: string, tabla: string, alias: string, cat: Catalogo): string {
  const items = partir(sel || '*')
  const cols: string[] = []
  for (const it of items) {
    const m = /^(?:([A-Za-z_]\w*):)?([A-Za-z_]\w*)(?:!\w+)?\((.*)\)$/s.exec(it)
    if (m) {
      const [, as, emb, interior] = m
      cols.push(embebido(as ?? emb, emb, interior, tabla, alias, cat))
    } else if (it === '*') {
      cols.push(`${alias}.*`)
    } else {
      const c = /^(?:([A-Za-z_]\w*):)?([A-Za-z_]\w*)$/.exec(it)
      if (!c) throw new ErrorPeticion(`Columna no admitida: ${it}`)
      cols.push(c[1] ? `${alias}.${ident(c[2])} as ${ident(c[1])}` : `${alias}.${ident(c[2])}`)
    }
  }
  return cols.join(', ')
}

function embebido(as: string, emb: string, interior: string, tabla: string, alias: string, cat: Catalogo): string {
  const n = `_e${++contador}`
  // ¿La tabla actual apunta a la embebida (a uno)? ¿O la embebida apunta a la actual (a muchos)?
  const aUno = cat.fks.find((f) => f.tabla === tabla && f.ref === emb)
  const aMuchos = cat.fks.find((f) => f.tabla === emb && f.ref === tabla)
  const sub = (cond: string) => `select ${columnas(interior, emb, n, cat)} from public.${ident(emb)} ${n} where ${cond}`
  if (aUno) return `(select to_jsonb(x) from (${sub(`${n}.${ident(aUno.refcol)} = ${alias}.${ident(aUno.col)} limit 1`)}) x) as ${ident(as)}`
  if (aMuchos)
    return `coalesce((select jsonb_agg(to_jsonb(x)) from (${sub(`${n}.${ident(aMuchos.col)} = ${alias}.${ident(aMuchos.refcol)}`)}) x), '[]'::jsonb) as ${ident(as)}`
  throw new ErrorPeticion(`Sin relación entre ${tabla} y ${emb}`)
}

function valoresIn(v: string): string[] {
  const dentro = v.replace(/^\(/, '').replace(/\)$/, '')
  return partir(dentro).map((x) => x.replace(/^"(.*)"$/, '$1'))
}

function condicion(col: string, expr: string, alias: string): string {
  let negar = false
  let resto = expr
  if (resto.startsWith('not.')) {
    negar = true
    resto = resto.slice(4)
  }
  const i = resto.indexOf('.')
  const op = resto.slice(0, i)
  const val = resto.slice(i + 1)
  const c = `${alias}.${ident(col)}`
  let sql: string
  switch (op) {
    case 'eq': sql = `${c} = ${lit(val)}`; break
    case 'neq': sql = `${c} <> ${lit(val)}`; break
    case 'gt': sql = `${c} > ${lit(val)}`; break
    case 'gte': sql = `${c} >= ${lit(val)}`; break
    case 'lt': sql = `${c} < ${lit(val)}`; break
    case 'lte': sql = `${c} <= ${lit(val)}`; break
    case 'like': sql = `${c} like ${lit(val.replace(/\*/g, '%'))}`; break
    case 'ilike': sql = `${c} ilike ${lit(val.replace(/\*/g, '%'))}`; break
    case 'is': sql = `${c} is ${val === 'null' ? 'null' : val === 'true' ? 'true' : 'false'}`; break
    case 'in': sql = `${c} in (${valoresIn(val).map(lit).join(', ') || 'null'})`; break
    default: throw new ErrorPeticion(`Operador no admitido: ${op}`)
  }
  return negar ? `not (${sql})` : sql
}

function filtros(params: URLSearchParams, alias: string): string[] {
  const out: string[] = []
  for (const [k, v] of params) {
    if (RESERVADOS.has(k)) continue
    if (k === 'or') {
      const partes = partir(v.replace(/^\(/, '').replace(/\)$/, '')).map((p) => {
        const j = p.indexOf('.')
        return condicion(p.slice(0, j), p.slice(j + 1), alias)
      })
      out.push(`(${partes.join(' or ')})`)
    } else {
      out.push(condicion(k, v, alias))
    }
  }
  return out
}

function orden(params: URLSearchParams, alias: string): string {
  const o = params.get('order')
  if (!o) return ''
  const partes = partir(o).map((p) => {
    const [col, ...mods] = p.split('.')
    const dir = mods.includes('desc') ? 'desc' : 'asc'
    const nulos = mods.includes('nullsfirst') ? ' nulls first' : mods.includes('nullslast') ? ' nulls last' : ''
    return `${alias}.${ident(col)} ${dir}${nulos}`
  })
  return ` order by ${partes.join(', ')}`
}

export interface Consulta {
  /** SQL que devuelve UNA fila con la columna `r` (jsonb). */
  sql: string
  /** Conteo exacto de filas con los mismos filtros (sin límite). */
  conteo?: string
  /** Respuesta de un solo objeto (single / maybeSingle). */
  uno: boolean
  /** Cuerpo vacío (return=minimal o HEAD). */
  vacio: boolean
  estado: number
}

/** Convierte una petición REST de tabla en SQL. `ruta` es el nombre de la tabla o vista. */
export function traducirTabla(metodo: string, ruta: string, url: URL, cabeceras: Headers, cuerpo: string | null, cat: Catalogo): Consulta {
  const t = ident(ruta)
  const params = url.searchParams
  const prefer = cabeceras.get('Prefer') ?? ''
  const accept = cabeceras.get('Accept') ?? ''
  const uno = accept.includes('vnd.pgrst.object')
  const devuelve = prefer.includes('return=representation')
  const cuentaExacto = /count=(exact|planned|estimated)/.test(prefer)
  const envolver = (consulta: string) => `select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) as r from (${consulta}) x`

  if (metodo === 'GET' || metodo === 'HEAD') {
    const where = filtros(params, '_t')
    const cond = where.length ? ` where ${where.join(' and ')}` : ''
    const lim = params.get('limit') ? ` limit ${Number(params.get('limit'))}` : ''
    const off = params.get('offset') ? ` offset ${Number(params.get('offset'))}` : ''
    const cols = columnas(params.get('select') ?? '*', ruta, '_t', cat)
    return {
      sql: envolver(`select ${cols} from public.${t} _t${cond}${orden(params, '_t')}${lim}${off}`),
      conteo: cuentaExacto ? `select count(*)::int as n from public.${t} _t${cond}` : undefined,
      uno,
      vacio: metodo === 'HEAD',
      estado: 200,
    }
  }

  if (metodo === 'POST') {
    const filas = cuerpo ? (JSON.parse(cuerpo) as Record<string, unknown> | Record<string, unknown>[]) : []
    const lista = Array.isArray(filas) ? filas : [filas]
    if (!lista.length) return { sql: `select '[]'::jsonb as r`, uno, vacio: true, estado: 201 }
    const claves = [...new Set(lista.flatMap((f) => Object.keys(f)))]
    const valores = lista.map((f) => `(${claves.map((k) => (k in f ? lit(f[k]) : 'default')).join(', ')})`).join(', ')
    let conflicto = ''
    if (prefer.includes('resolution=merge-duplicates') || prefer.includes('resolution=ignore-duplicates')) {
      const on = (params.get('on_conflict') ?? '').split(',').filter(Boolean)
      const objetivo = on.length ? ` (${on.map(ident).join(', ')})` : ''
      const sets = claves.filter((k) => !on.includes(k)).map((k) => `${ident(k)} = excluded.${ident(k)}`)
      conflicto = prefer.includes('ignore-duplicates') || !sets.length ? ` on conflict${objetivo} do nothing` : ` on conflict${objetivo} do update set ${sets.join(', ')}`
    }
    const ins = `insert into public.${t} (${claves.map(ident).join(', ')}) values ${valores}${conflicto} returning *`
    return { sql: `with i as (${ins}) select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) as r from i`, uno, vacio: !devuelve, estado: 201 }
  }

  if (metodo === 'PATCH') {
    const cambios = JSON.parse(cuerpo ?? '{}') as Record<string, unknown>
    const sets = Object.entries(cambios).map(([k, v]) => `${ident(k)} = ${lit(v)}`)
    if (!sets.length) throw new ErrorPeticion('Sin cambios')
    const w = filtros(params, t)
    const upd = `update public.${t} set ${sets.join(', ')}${w.length ? ` where ${w.join(' and ')}` : ''} returning *`
    return { sql: `with u as (${upd}) select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb) as r from u`, uno, vacio: !devuelve, estado: devuelve ? 200 : 204 }
  }

  if (metodo === 'DELETE') {
    const w = filtros(params, t)
    const del = `delete from public.${t}${w.length ? ` where ${w.join(' and ')}` : ''} returning *`
    return { sql: `with d as (${del}) select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) as r from d`, uno, vacio: !devuelve, estado: devuelve ? 200 : 204 }
  }

  throw new ErrorPeticion(`Método no admitido: ${metodo}`, 405)
}

/** Convierte una llamada rpc en SQL (argumentos con nombre). */
export function traducirRpc(nombre: string, cuerpo: string | null, cat: Catalogo): Consulta {
  const f = cat.funciones[nombre]
  if (!f) throw new ErrorPeticion(`Función desconocida: ${nombre}`, 404, 'PGRST202')
  const args = cuerpo ? (JSON.parse(cuerpo) as Record<string, unknown>) : {}
  const llamada = `public.${ident(nombre)}(${Object.entries(args)
    .map(([k, v]) => `${ident(k)} => ${lit(v)}`)
    .join(', ')})`
  let sql: string
  if (f.retset) {
    sql =
      f.tipo === 'b'
        ? `select coalesce(jsonb_agg(v), '[]'::jsonb) as r from (select ${llamada} as v) t`
        : `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as r from ${llamada} t`
  } else if (f.tipo === 'v') {
    sql = `select null::jsonb as r from (select ${llamada}) t`
  } else {
    sql = `select to_jsonb(${llamada}) as r`
  }
  return { sql, uno: false, vacio: f.tipo === 'v', estado: 200 }
}
