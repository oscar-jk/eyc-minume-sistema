import { describe, expect, it } from 'vitest'
import { promedioDe, promediosGenerales, type CampoMin, type EnvioMin } from '@/features/formularios/filtrarRespuestas'

const campo = (id: string, tipo: CampoMin['tipo'], opciones: unknown = [], extra: Partial<CampoMin> = {}): CampoMin => ({ id, tipo, etiqueta: id, activo: true, opciones, con_otro: false, ...extra })
const envio = (n: number, comision: number, respuestas: Record<string, unknown>): EnvioMin => ({ id: `e${n}`, rol: 'delegado', comision_id: comision, referencia: null, creado_en: '2026-11-05T12:00:00Z', respuestas })

const LIKERT = ['1 Deficiente', '2 Regular', '3 Bueno', '4 Muy Bueno', '5 Excelente']

describe('promedios del formulario', () => {
  it('promedia una escala', () => {
    const p = promedioDe(campo('a', 'escala', [], { escala_min: 1, escala_max: 5 }), [envio(1, 1, { a: 4 }), envio(2, 1, { a: 5 }), envio(3, 1, { a: 3 })])
    expect(p?.promedio).toBe(4)
    expect(p?.rango).toEqual([1, 5])
  })

  it('promedia opciones que empiezan con un número («1 Deficiente» … «5 Excelente»)', () => {
    const p = promedioDe(campo('a', 'radio', LIKERT), [envio(1, 1, { a: '5 Excelente' }), envio(2, 1, { a: '4 Muy Bueno' }), envio(3, 1, {})])
    expect(p?.promedio).toBe(4.5)
    expect(p?.n).toBe(2)
  })

  it('no promedia opciones que no son números (Sí / No, a) b) c))', () => {
    expect(promedioDe(campo('a', 'radio', ['Sí', 'No']), [envio(1, 1, { a: 'Sí' })])).toBeNull()
    expect(promedioDe(campo('a', 'radio', ['a) Muy claros', 'b) Claros']), [envio(1, 1, { a: 'a) Muy claros' })])).toBeNull()
  })

  it('texto libre: solo si la mayoría escribió una cifra, y cuenta solo esas', () => {
    const c = campo('a', 'texto')
    const casi = promedioDe(c, [envio(1, 1, { a: '100' }), envio(2, 1, { a: '90' }), envio(3, 1, { a: '80' }), envio(4, 1, { a: 'todos' })])
    expect(casi?.promedio).toBe(90)
    expect(casi?.n).toBe(3)
    expect(casi?.de).toBe(4)
    expect(promedioDe(c, [envio(1, 1, { a: 'buena' }), envio(2, 1, { a: 'mala' }), envio(3, 1, { a: '5' })])).toBeNull()
  })

  it('promedio general por escala y por comisión', () => {
    const cs = [campo('a', 'radio', LIKERT), campo('b', 'radio', LIKERT)]
    const es = [envio(1, 1, { a: '5 Excelente', b: '5 Excelente' }), envio(2, 2, { a: '3 Bueno', b: '1 Deficiente' })]
    const [g] = promediosGenerales(cs, es)
    expect(g.etiqueta).toBe('1 a 5')
    expect(g.promedio).toBe(3.5)
    expect(g.porComision).toEqual([
      { comision: 1, promedio: 5 },
      { comision: 2, promedio: 2 },
    ])
  })
})
