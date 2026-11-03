/**
 * Motor del modo demostración: una base Postgres en memoria (PGlite) con las migraciones reales del proyecto
 * y datos ficticios, más un «servidor» que contesta las peticiones del cliente sin salir nunca a la red.
 * Se carga solo cuando se entra a la demostración (import dinámico).
 */
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { ErrorPeticion, traducirRpc, traducirTabla, type Catalogo } from './rest'
import semilla from './semilla.sql?raw'
import { DEMO_USUARIOS, sesionDemo, type RolDemo } from './sesion'

const migraciones = import.meta.glob('/supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const ARRANQUE = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema extensions; create extension if not exists pgcrypto with schema extensions;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, encrypted_password text,
    raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}', last_sign_in_at timestamptz, recovery_sent_at timestamptz, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select coalesce(nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'role', ''), 'anon') $$;
  grant usage on schema public, extensions to anon, authenticated, service_role;
`

let db: PGlite | null = null
let catalogo: Catalogo | null = null
let listo: Promise<void> | null = null

async function cargarCatalogo(d: PGlite): Promise<Catalogo> {
  const fks = await d.query<{ tabla: string; col: string; ref: string; refcol: string }>(`
    select c.conrelid::regclass::text as tabla, a.attname as col, c.confrelid::regclass::text as ref, af.attname as refcol
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
    where c.contype = 'f' and array_length(c.conkey, 1) = 1 and c.connamespace = 'public'::regnamespace`)
  const fns = await d.query<{ nombre: string; retset: boolean; tipo: string }>(`
    select p.proname as nombre, p.proretset as retset,
           case when p.prorettype = 'void'::regtype then 'v' else t.typtype::text end as tipo
    from pg_proc p join pg_type t on t.oid = p.prorettype
    where p.pronamespace = 'public'::regnamespace`)
  const limpiar = (s: string) => s.replace(/^public\./, '').replace(/"/g, '')
  return {
    fks: fks.rows.map((f) => ({ tabla: limpiar(f.tabla), col: f.col, ref: limpiar(f.ref), refcol: f.refcol })),
    funciones: Object.fromEntries(fns.rows.map((f) => [f.nombre, { retset: f.retset, tipo: f.tipo }])),
  }
}

/** Prepara la base (una sola vez): migraciones, datos ficticios y catálogo de relaciones y funciones. */
export function iniciar(): Promise<void> {
  listo ??= (async () => {
    const d = new PGlite({ extensions: { btree_gist, pgcrypto } })
    await d.exec(ARRANQUE)
    for (const ruta of Object.keys(migraciones).sort()) {
      try {
        await d.exec(migraciones[ruta])
      } catch (e) {
        throw new Error(`Demostración: falló ${ruta.split('/').pop()}: ${e instanceof Error ? e.message : e}`, { cause: e })
      }
    }
    await d.exec(semilla)
    catalogo = await cargarCatalogo(d)
    db = d
  })()
  return listo
}

function respuesta(cuerpo: unknown, estado = 200, extra: Record<string, string> = {}): Response {
  const vacio = estado === 204 || cuerpo === undefined
  return new Response(vacio ? null : JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json', ...extra } })
}

function error(mensaje: string, estado = 400, codigo = 'PGRST100', detalle: string | null = null, pista: string | null = null) {
  return respuesta({ code: codigo, message: mensaje, details: detalle, hint: pista }, estado)
}

function usuarioDe(cabeceras: Headers): { id: string; rol: RolDemo } | null {
  const token = (cabeceras.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const m = /^demo\.([\w-]+)\./.exec(token)
  if (!m) return null
  try {
    const { sub } = JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub: string }
    const u = Object.entries(DEMO_USUARIOS).find(([, v]) => v.id === sub)
    return u ? { id: sub, rol: u[0] as RolDemo } : null
  } catch {
    return null
  }
}

let cola: Promise<unknown> = Promise.resolve()
/** Ejecuta de uno en uno, dentro de una transacción con el rol y las credenciales del usuario (RLS real). */
function enSerie<T>(fn: () => Promise<T>): Promise<T> {
  const p = cola.then(fn, fn)
  cola = p.catch(() => undefined)
  return p
}

async function consultar(sql: string, conteo: string | undefined, usuario: { id: string } | null) {
  const d = db!
  return enSerie(() =>
    d.transaction(async (tx) => {
      const claims = usuario ? { sub: usuario.id, role: 'authenticated' } : { role: 'anon' }
      await tx.exec(`set local role ${usuario ? 'authenticated' : 'anon'}`)
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)])
      const r = await tx.query<{ r: unknown }>(sql)
      const n = conteo ? (await tx.query<{ n: number }>(conteo)).rows[0].n : undefined
      return { dato: r.rows[0]?.r ?? null, n }
    }),
  )
}

/** «fetch» del cliente en modo demostración: contesta las rutas de datos y de sesión con la base en memoria. */
export async function manejar(entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  await iniciar()
  const peticion = entrada instanceof Request ? entrada : null
  const url = new URL(peticion ? peticion.url : String(entrada))
  const metodo = (init?.method ?? peticion?.method ?? 'GET').toUpperCase()
  const cabeceras = new Headers(init?.headers ?? peticion?.headers)
  const cuerpo = typeof init?.body === 'string' ? init.body : null

  // Sesión: la demostración ya trae la suya; solo se contestan las rutas que el cliente consulta.
  if (url.pathname.startsWith('/auth/v1')) {
    const u = usuarioDe(cabeceras)
    if (url.pathname.endsWith('/logout')) return respuesta(undefined, 204)
    if (u) return respuesta(sesionDemo(u.rol).user)
    return error('Sesión de demostración no disponible', 401, 'demo_auth')
  }
  if (url.pathname.startsWith('/functions/v1')) return error('Esta acción no está disponible en la demostración.', 400, 'demo_no_disponible')

  const m = /^\/rest\/v1\/(.+)$/.exec(url.pathname)
  if (!m) return error('Ruta no disponible en la demostración', 404, 'demo_ruta')
  const ruta = decodeURIComponent(m[1])
  const usuario = usuarioDe(cabeceras)

  try {
    const q = ruta.startsWith('rpc/') ? traducirRpc(ruta.slice(4), cuerpo, catalogo!) : traducirTabla(metodo, ruta, url, cabeceras, cuerpo, catalogo!)
    const { dato, n } = await consultar(q.sql, q.conteo, usuario)
    const extra: Record<string, string> = {}
    if (n !== undefined) extra['Content-Range'] = `0-${Math.max(n - 1, 0)}/${n}`
    if (q.vacio) return new Response(null, { status: q.estado, headers: extra })
    if (q.uno) {
      const filas = Array.isArray(dato) ? dato : [dato]
      if (filas.length !== 1) return error('JSON object requested, multiple (or no) rows returned', 406, 'PGRST116', `The result contains ${filas.length} rows`)
      return respuesta(filas[0], q.estado, extra)
    }
    return respuesta(dato, q.estado, extra)
  } catch (e) {
    if (e instanceof ErrorPeticion) return error(e.message, e.estado, e.codigo)
    const pg = e as { message?: string; code?: string; detail?: string; hint?: string }
    const estado = pg.code === '42501' ? 403 : pg.code === '23505' ? 409 : 400
    return error(pg.message ?? 'Error', estado, pg.code ?? 'demo_error', pg.detail ?? null, pg.hint ?? null)
  }
}
