import { PREFIJO_OTRO, opcionesDe, type TipoCampo } from './tipos'
import type { ResumenCampo } from './api'

/** Filtros de las respuestas de un formulario: por quién respondió y por lo que respondió. */

export interface CampoMin {
  id: string
  tipo: TipoCampo
  etiqueta: string
  activo: boolean
  opciones: unknown
  con_otro: boolean | null
}

export interface EnvioMin {
  id: string
  rol: string | null
  comision_id: number | null
  referencia: string | null
  creado_en: string
  respuestas: Record<string, unknown>
}

/** Cómo se compara la respuesta de una pregunta. */
export type ModoCampo = 'valor' | 'lleno' | 'vacio'

export interface FiltroCampo {
  clave: number
  campoId: string
  modo: ModoCampo
  /** Opción elegida, «si»/«no», o texto a buscar (según el tipo de pregunta). */
  valor: string
  min: string
  max: string
}

export interface Filtros {
  comision: string
  rol: string
  referencia: string
  desde: string
  hasta: string
  texto: string
  campos: FiltroCampo[]
}

export const FILTROS_VACIOS: Filtros = { comision: '', rol: '', referencia: '', desde: '', hasta: '', texto: '', campos: [] }

export const OTRO = '__otro'

/** Texto legible de una respuesta (para buscar y para el CSV). */
export const textoRespuesta = (v: unknown): string =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? String((v as { nombre?: string }).nombre ?? (v as { otro?: string }).otro ?? '')
    : Array.isArray(v)
      ? v.join(' · ')
      : v === true
        ? 'Sí'
        : v === false
          ? 'No'
          : v == null
            ? ''
            : String(v)

/** Quién respondió, si el formulario se lo pregunta (un campo de texto con «nombre» o «correo» en la etiqueta). */
export function identidadDe(e: EnvioMin, campos: CampoMin[]): { nombre: string; correo: string } {
  const dato = (re: RegExp) => {
    const c = campos.find((x) => x.tipo === 'texto' && re.test(x.etiqueta))
    return c ? textoRespuesta(e.respuestas[c.id]).trim() : ''
  }
  return { nombre: dato(/nombre/i), correo: dato(/correo|e-?mail/i) }
}

/** Cuántas preguntas respondió esta llenada. */
export const respondidas = (e: EnvioMin, campos: CampoMin[]) => campos.filter((c) => !vacia(e.respuestas[c.id])).length

const vacia = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
const esOtroTxt = (x: unknown) => typeof x === 'string' && x.startsWith(PREFIJO_OTRO)
const minuscula = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

/** ¿Un filtro de pregunta ya dice algo? (uno sin valor no filtra). */
export const filtroCampoActivo = (f: FiltroCampo) => f.modo !== 'valor' || f.valor !== '' || f.min !== '' || f.max !== ''

export const hayFiltros = (f: Filtros) =>
  !!(f.comision || f.rol || f.referencia || f.desde || f.hasta || f.texto.trim() || f.campos.some(filtroCampoActivo))

function cumpleCampo(e: EnvioMin, f: FiltroCampo, c: CampoMin | undefined): boolean {
  if (!c) return true
  const v = e.respuestas[c.id]
  if (f.modo === 'lleno') return !vacia(v)
  if (f.modo === 'vacio') return vacia(v)
  if (f.valor === '' && f.min === '' && f.max === '') return true
  switch (c.tipo) {
    case 'radio':
    case 'lista':
      return f.valor === OTRO ? esOtroTxt(v) : v === f.valor
    case 'checkbox':
      return Array.isArray(v) && (f.valor === OTRO ? v.some(esOtroTxt) : v.includes(f.valor))
    case 'si_no':
      return v === (f.valor === 'si')
    case 'escala':
    case 'numero': {
      if (typeof v !== 'number') return false
      if (f.min !== '' && v < Number(f.min)) return false
      if (f.max !== '' && v > Number(f.max)) return false
      return true
    }
    default:
      return minuscula(textoRespuesta(v)).includes(minuscula(f.valor.trim()))
  }
}

export function filtrar(envios: EnvioMin[], f: Filtros, campos: CampoMin[]): EnvioMin[] {
  const porId = new Map(campos.map((c) => [c.id, c]))
  const q = minuscula(f.texto.trim())
  const reglas = f.campos.filter(filtroCampoActivo)
  return envios.filter((e) => {
    if (f.comision && String(e.comision_id ?? '') !== f.comision) return false
    if (f.rol && (e.rol ?? '') !== f.rol) return false
    if (f.referencia && (e.referencia ?? '') !== f.referencia) return false
    const dia = e.creado_en.slice(0, 10)
    if (f.desde && dia < f.desde) return false
    if (f.hasta && dia > f.hasta) return false
    if (q && !minuscula([e.referencia ?? '', ...Object.values(e.respuestas).map(textoRespuesta)].join(' ')).includes(q)) return false
    return reglas.every((r) => cumpleCampo(e, r, porId.get(r.campoId)))
  })
}

const redondea = (n: number) => Math.round(n * 100) / 100

/** Resumen de una pregunta sobre las respuestas ya filtradas (mismo formato que devuelve la base). */
export function resumir(c: CampoMin, envios: EnvioMin[]): ResumenCampo {
  const valores = envios.map((e) => e.respuestas[c.id]).filter((v) => !vacia(v))
  const ops = opcionesDe(c.opciones)
  const nums = valores.filter((v): v is number => typeof v === 'number')
  let resumen: Record<string, unknown>
  switch (c.tipo) {
    case 'radio':
    case 'lista':
      resumen = Object.fromEntries(ops.map((o) => [o, valores.filter((v) => v === o).length]))
      break
    case 'checkbox':
      resumen = Object.fromEntries(ops.map((o) => [o, valores.filter((v) => Array.isArray(v) && v.includes(o)).length]))
      break
    case 'si_no':
      resumen = { si: valores.filter((v) => v === true).length, no: valores.filter((v) => v === false).length }
      break
    case 'escala': {
      const dist: Record<string, number> = {}
      for (const n of nums) dist[String(n)] = (dist[String(n)] ?? 0) + 1
      resumen = { promedio: nums.length ? redondea(nums.reduce((a, b) => a + b, 0) / nums.length) : 0, minimo: nums.length ? Math.min(...nums) : 0, maximo: nums.length ? Math.max(...nums) : 0, distribucion: dist }
      break
    }
    case 'numero':
      resumen = { promedio: nums.length ? redondea(nums.reduce((a, b) => a + b, 0) / nums.length) : 0, minimo: nums.length ? Math.min(...nums) : 0, maximo: nums.length ? Math.max(...nums) : 0 }
      break
    case 'personas': {
      const conteo: Record<string, number> = {}
      const otros: string[] = []
      for (const v of valores) {
        const o = v as { nombre?: string; otro?: string }
        if (o?.nombre) conteo[o.nombre] = (conteo[o.nombre] ?? 0) + 1
        else if (o?.otro) otros.push(o.otro)
      }
      resumen = { conteo, otros }
      break
    }
    default:
      resumen = { valores: [...envios].sort((a, b) => b.creado_en.localeCompare(a.creado_en)).map((e) => e.respuestas[c.id]).filter((v) => !vacia(v)).slice(0, 100).map(textoRespuesta) }
  }
  let otros: string[] | null = null
  if (c.con_otro) otros = valores.flatMap((v) => (Array.isArray(v) ? v : [v])).filter(esOtroTxt).map((x) => (x as string).slice(PREFIJO_OTRO.length))
  return { campo_id: c.id, etiqueta: c.etiqueta, tipo: c.tipo, activo: c.activo, respuestas: valores.length, resumen, otros }
}
