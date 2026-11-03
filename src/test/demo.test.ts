import { describe, expect, it } from 'vitest'
import { lit, traducirRpc, traducirTabla, type Catalogo } from '@/demo/rest'

const cat: Catalogo = {
  fks: [
    { tabla: 'actividades', col: 'fase_id', ref: 'fases', refcol: 'id' },
    { tabla: 'actividades', col: 'comision_id', ref: 'comisiones', refcol: 'id' },
  ],
  funciones: {
    guardar_evaluacion: { retset: false, tipo: 'b' },
    dashboard_monitoreo: { retset: false, tipo: 'b' },
    asignados_en: { retset: true, tipo: 'p' },
    decidir: { retset: false, tipo: 'v' },
  },
}
const pedir = (metodo: string, ruta: string, query = '', cab: Record<string, string> = {}, cuerpo: string | null = null) =>
  traducirTabla(metodo, ruta, new URL(`http://x/rest/v1/${ruta}${query}`), new Headers(cab), cuerpo, cat)

describe('demostración: traductor de peticiones a SQL', () => {
  it('escapa los textos (nada se inyecta)', () => {
    expect(lit("O'Brien")).toBe("'O''Brien'")
    expect(lit(null)).toBe('null')
    expect(lit(['a', 'b"c'])).toBe(`'{"a","b\\"c"}'`)
  })

  it('select con filtros, orden y límite', () => {
    const q = pedir('GET', 'v_evaluaciones', '?select=*&persona_id=eq.123&ambito=eq.eyc&order=fecha.desc,persona_nombre.asc&limit=5')
    expect(q.sql).toContain(`_t."persona_id" = '123'`)
    expect(q.sql).toContain(`_t."ambito" = 'eyc'`)
    expect(q.sql).toContain('order by _t."fecha" desc, _t."persona_nombre" asc')
    expect(q.sql).toContain('limit 5')
    expect(q.uno).toBe(false)
  })

  it('embebidos a uno (fase, comisión) y operador in', () => {
    const q = pedir('GET', 'actividades', '?select=*,fase:fases(nombre,estado),comision:comisiones(sigla,clave)&id=in.(a,b)')
    expect(q.sql).toContain('as "fase"')
    expect(q.sql).toContain('as "comision"')
    expect(q.sql).toContain(`in ('a', 'b')`)
  })

  it('no admite nombres con inyección', () => {
    expect(() => pedir('GET', 'personas', '?select=*&x;drop=eq.1')).toThrow()
    expect(() => pedir('GET', 'personas;drop table x')).toThrow()
  })

  it('single exige un solo objeto y head cuenta', () => {
    expect(pedir('GET', 'personas', '?id=eq.1', { Accept: 'application/vnd.pgrst.object+json' }).uno).toBe(true)
    const h = pedir('HEAD', 'evaluaciones', '?select=id&estado=eq.completa', { Prefer: 'count=exact' })
    expect(h.vacio).toBe(true)
    expect(h.conteo).toContain('count(*)')
  })

  it('insert y upsert', () => {
    const i = pedir('POST', 'actividades', '', { Prefer: 'return=representation' }, JSON.stringify({ nombre: "Taller 'A'", fecha: '2026-10-20' }))
    expect(i.sql).toContain(`insert into public."actividades" ("nombre", "fecha") values ('Taller ''A''', '2026-10-20')`)
    expect(i.vacio).toBe(false)
    const u = pedir('POST', 'calificacion_inicial', '?on_conflict=persona_id', { Prefer: 'resolution=merge-duplicates,return=representation' }, JSON.stringify([{ persona_id: 'p', examen: 80 }]))
    expect(u.sql).toContain('on conflict ("persona_id") do update set "examen" = excluded."examen"')
  })

  it('update y delete con filtros', () => {
    expect(pedir('PATCH', 'personas', '?id=eq.1', {}, JSON.stringify({ nombre: 'Ana' })).sql).toContain(`set "nombre" = 'Ana' where "personas"."id" = '1'`)
    expect(pedir('DELETE', 'evaluaciones', '?id=eq.1&estado=eq.borrador').sql).toContain('delete from public."evaluaciones" where')
  })

  it('rpc: escalar, tabla y void', () => {
    expect(traducirRpc('dashboard_monitoreo', JSON.stringify({ p_corte: 1 }), cat).sql).toBe(`select to_jsonb(public."dashboard_monitoreo"("p_corte" => 1)) as r`)
    expect(traducirRpc('guardar_evaluacion', JSON.stringify({ p: { id: 'x' } }), cat).sql).toContain(`"p" => '{"id":"x"}'`)
    expect(traducirRpc('asignados_en', '{}', cat).sql).toContain('from public."asignados_en"() t')
    expect(traducirRpc('decidir', '{}', cat).vacio).toBe(true)
    expect(() => traducirRpc('no_existe', '{}', cat)).toThrow()
  })
})
