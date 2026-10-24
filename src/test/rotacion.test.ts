import { describe, expect, it } from 'vitest'
import {
  cambiarDestino,
  claveDestino,
  diaDeSesiones,
  esRotable,
  inicioDelDia,
  movimientosDelPlan,
  revisarPlan,
  planInicial,
  type Casilla,
  type Historial,
} from '@/features/asignaciones/rotacion'

const DIRECTOR = 1
const ADJ1 = 2

/** 5 comisiones con director y adjunto I cada una; cada persona solo conoce su comisión de origen. */
function escenario() {
  const casillas: Casilla[] = []
  const historial: Historial = new Map()
  for (let c = 1; c <= 5; c++) {
    for (const cargo of [DIRECTOR, ADJ1]) {
      const id = `p${c}-${cargo}`
      casillas.push({ personaId: id, comisionId: c, cargoId: cargo, orden: c })
      historial.set(id, new Set([c]))
    }
  }
  return { casillas, historial }
}

describe('rotación manual de mesas', () => {
  it('el plan de partida no mueve a nadie', () => {
    const { casillas } = escenario()
    expect(movimientosDelPlan(planInicial(casillas), casillas)).toEqual([])
  })

  it('mover a alguien a un lugar libre solo lo cambia a él', () => {
    const { casillas, historial } = escenario()
    const plan = cambiarDestino(planInicial(casillas), 'p1-1', { comisionId: 9, cargoId: DIRECTOR })
    expect(movimientosDelPlan(plan, casillas)).toEqual([{ persona_id: 'p1-1', comision_id: 9, cargo_id: DIRECTOR }])
    expect(revisarPlan(plan, casillas, historial).repiten).toEqual([])
  })

  it('mandar a alguien al lugar de otra persona las intercambia y nadie queda duplicado', () => {
    const { casillas } = escenario()
    const plan = cambiarDestino(planInicial(casillas), 'p1-1', { comisionId: 3, cargoId: DIRECTOR })
    expect(plan.get('p1-1')).toEqual({ comisionId: 3, cargoId: DIRECTOR })
    expect(plan.get('p3-1')).toEqual({ comisionId: 1, cargoId: DIRECTOR })
    expect(new Set([...plan.values()].map(claveDestino)).size).toBe(casillas.length)
    expect(movimientosDelPlan(plan, casillas)).toHaveLength(2)
  })

  it('la Subse puede cambiar también el cargo', () => {
    const { casillas } = escenario()
    const plan = cambiarDestino(planInicial(casillas), 'p1-1', { comisionId: 2, cargoId: ADJ1 })
    expect(plan.get('p1-1')).toEqual({ comisionId: 2, cargoId: ADJ1 })
    expect(plan.get('p2-2')).toEqual({ comisionId: 1, cargoId: DIRECTOR })
  })

  it('se avisa cuando alguien va a una comisión que ya conoció o se queda donde está', () => {
    const { casillas, historial } = escenario()
    historial.get('p1-1')!.add(2)
    const plan = cambiarDestino(planInicial(casillas), 'p1-1', { comisionId: 2, cargoId: DIRECTOR })
    const rev = revisarPlan(plan, casillas, historial)
    expect(rev.repiten).toContain('p1-1')
    expect(rev.sinCambio).not.toContain('p1-1')
    expect(rev.sinCambio).toContain('p4-1')
  })
})

describe('quién rota y cuándo', () => {
  const sin = new Set(['cij'])
  it('rotan los miembros de mesa con cargo de dirección', () => {
    expect(esRotable({ ambito: 'mesa', cargoClave: 'director', comisionClave: 'ctd' }, sin)).toBe(true)
    expect(esRotable({ ambito: 'mesa', cargoClave: 'adjunto2', comisionClave: 'pnud' }, sin)).toBe(true)
  })
  it('EyC y aprendices se quedan fijos', () => {
    expect(esRotable({ ambito: 'eyc', cargoClave: 'eyc', comisionClave: 'ctd' }, sin)).toBe(false)
    expect(esRotable({ ambito: 'mesa', cargoClave: 'aprendiz', comisionClave: 'ctd' }, sin)).toBe(false)
  })
  it('la CIJ no rota', () => {
    expect(esRotable({ ambito: 'mesa', cargoClave: 'director', comisionClave: 'cij' }, sin)).toBe(false)
  })
  it('el lunes 16 es el día 1; el 2 y el 3 son martes 17 y miércoles 18', () => {
    expect(diaDeSesiones('2026-11-16', 1)).toBe('2026-11-16')
    expect(diaDeSesiones('2026-11-16', 2)).toBe('2026-11-17')
    expect(diaDeSesiones('2026-11-16', 3)).toBe('2026-11-18')
    expect(new Date('2026-11-16T12:00:00Z').getUTCDay()).toBe(1) // lunes
  })
  it('el día empieza a medianoche en la zona del evento', () => {
    expect(inicioDelDia('2026-11-17')).toBe('2026-11-17T00:00:00-04:00')
  })
})
