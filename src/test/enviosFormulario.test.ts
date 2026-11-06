import { describe, expect, it, vi } from 'vitest'

// Base falsa que, como la real, devuelve como máximo 1000 filas por consulta.
const TOPE = 1000
const N_ENVIOS = 41
const N_CAMPOS = 61
const envios = Array.from({ length: N_ENVIOS }, (_, i) => ({ id: `e${String(i).padStart(3, '0')}`, rol: 'delegado', comision_id: 1, referencia: null, creado_en: `2026-11-05T${String(i % 24).padStart(2, '0')}:00:00Z` }))
const respuestas = envios.flatMap((e) => Array.from({ length: N_CAMPOS }, (_, k) => ({ envio_id: e.id, campo_id: `c${String(k).padStart(3, '0')}`, valor: `${e.id}-${k}` })))

function consulta(tabla: string) {
  let ids: string[] | null = null
  let rango: [number, number] | null = null
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    order: () => b,
    limit: () => b,
    in: (_c: string, v: string[]) => ((ids = v), b),
    range: (a: number, z: number) => ((rango = [a, z]), b),
    then: (ok: (r: { data: unknown[]; error: null }) => unknown) => {
      let filas: unknown[] = tabla === 'formulario_envios' ? envios : respuestas.filter((r) => ids?.includes(r.envio_id))
      filas = filas.slice(rango?.[0] ?? 0, (rango?.[1] ?? TOPE - 1) + 1).slice(0, TOPE)
      return Promise.resolve(ok({ data: filas, error: null }))
    },
  }
  return b
}
vi.mock('@/lib/supabase', () => ({ supabase: { from: (t: string) => consulta(t) } }))

import { cargarEnvios } from '@/features/formularios/api'

describe('cargarEnvios', () => {
  it('trae todas las respuestas de cada envío aunque la base corte a 1000 filas por consulta', async () => {
    const r = await cargarEnvios('f1')
    expect(r).toHaveLength(N_ENVIOS)
    for (const e of r) expect(Object.keys(e.respuestas)).toHaveLength(N_CAMPOS)
  })
})
