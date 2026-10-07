import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Semaforo } from '@/components/Semaforo'
import { esDesfavorable } from '@/features/evaluacion/reglas'
import { puntaje, suma } from '@/lib/formato'

// Las reglas de cálculo se prueban en la base (supabase/tests/reglas.sql).
// Aquí se prueban las garantías de la interfaz.

describe('comentario obligatorio según la respuesta favorable de cada criterio', () => {
  it('criterio en positivo: «No» es desfavorable', () => {
    expect(esDesfavorable({ favorable: 'si' }, 'no')).toBe(true)
    expect(esDesfavorable({ favorable: 'si' }, 'si')).toBe(false)
  })
  it('criterio en negativo: «Sí» es desfavorable y «No» es lo esperado', () => {
    expect(esDesfavorable({ favorable: 'no' }, 'si')).toBe(true)
    expect(esDesfavorable({ favorable: 'no' }, 'no')).toBe(false)
  })
  it('N/O nunca exige comentario', () => {
    expect(esDesfavorable({ favorable: 'si' }, 'no_observado')).toBe(false)
    expect(esDesfavorable({ favorable: 'no' }, 'no_observado')).toBe(false)
    expect(esDesfavorable({ favorable: 'si' }, undefined)).toBe(false)
  })
})

describe('no evaluado nunca se muestra como 0', () => {
  it('puntaje nulo se muestra como guion', () => {
    expect(puntaje(null)).toBe('—')
    expect(puntaje(undefined)).toBe('—')
    expect(puntaje(0)).toBe('0')
  })
  it('semáforo gris dice «No evaluado» sin número', () => {
    render(<Semaforo semaforo="gris" puntaje={null} n={0} />)
    expect(screen.getByText('No evaluado')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})

describe('el semáforo no depende solo del color', () => {
  it('muestra etiqueta, puntaje y cantidad de evaluaciones', () => {
    render(<Semaforo semaforo="amarillo" puntaje={72.5} n={3} />)
    expect(screen.getByText('Seguimiento')).toBeInTheDocument()
    expect(screen.getByText('72.5')).toBeInTheDocument()
    expect(screen.getByText(/3 evaluaciones/)).toBeInTheDocument()
  })
  it('en modo compacto la cantidad sigue disponible para lectores de pantalla', () => {
    render(<Semaforo semaforo="verde" puntaje={90} n={1} compacto />)
    expect(screen.getByText('1 evaluación')).toHaveClass('sr-only')
  })
})

describe('validación en vivo de pesos', () => {
  it('suma exacta con decimales', () => {
    expect(suma([20, 30, 15, 15, 10, 10])).toBe(100)
    expect(suma([33.3, 33.3, 33.4])).toBe(100)
    expect(suma([20, 30, 15, 15, 10])).toBe(90)
  })
})
