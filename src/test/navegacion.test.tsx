import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Rol } from '@/lib/tipos'

let rol: Rol = 'subsecretario'
vi.mock('@/features/auth/AuthProvider', () => ({ useSesion: () => ({ perfil: { id: 'u1', nombre: 'Prueba', rol, activo: true } }) }))
vi.mock('@/features/auth/api', () => ({ salir: vi.fn() }))
vi.mock('@/app/fase', () => ({ useMomento: () => ({ cargando: true, abiertas: [], fases: [], cortes: [] }) }))
vi.mock('@/components/CieloEstrellado', () => ({ CieloEstrellado: () => null }))
vi.mock('@/features/configuracion/Cuentas', () => ({ AuditoriaPanel: () => <p>PANEL-AUDITORIA</p>, CuentasPanel: () => <p>PANEL-CUENTAS</p> }))
vi.mock('@/features/configuracion/Pesos', () => ({ CortesPanel: () => <p>PANEL-CORTES</p>, PesosPanel: () => <p>PANEL-PESOS</p> }))
vi.mock('@/features/configuracion/Catalogos', () => ({ CatalogosPanel: () => <p>PANEL-CATALOGOS</p> }))
vi.mock('@/features/configuracion/Criterios', () => ({ CriteriosPanel: () => <p>PANEL-CRITERIOS</p> }))
vi.mock('@/features/configuracion/Fases', () => ({ FasesPanel: () => <p>PANEL-FASES</p> }))

import { Layout } from '@/app/Layout'
import { ConfiguracionPage } from '@/features/configuracion/ConfiguracionPage'

afterEach(cleanup)

const lateral = () => within(document.querySelector('aside')!)
const enlaces = () => lateral().getAllByRole('link').map((a) => a.textContent?.trim()).filter(Boolean)

function verLayout(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Layout />
    </MemoryRouter>,
  )
}

describe('menú lateral por rol', () => {
  beforeEach(() => {
    rol = 'subsecretario'
  })

  it('Formularios es un elemento del menú, justo debajo de Configuración', () => {
    verLayout('/monitoreo')
    expect(enlaces()).toEqual(expect.arrayContaining(['Monitoreo', 'Decisiones', 'Comisiones', 'Personas', 'Evaluación de evaluadores', 'Configuración', 'Formularios', 'Manual de usuario']))
    const e = enlaces()
    expect(e.indexOf('Formularios')).toBe(e.indexOf('Configuración') + 1)
  })

  it('agrupa por secciones y marca la sección activa', () => {
    verLayout('/monitoreo')
    for (const g of ['Seguimiento y control', 'Evaluación', 'Administración', 'Documentación']) expect(lateral().getByText(g)).toBeInTheDocument()
    expect(lateral().getByRole('link', { name: 'Monitoreo' })).toHaveAttribute('aria-current', 'page')
    expect(lateral().getByRole('link', { name: 'Decisiones' })).not.toHaveAttribute('aria-current')
  })

  it('dentro de /formularios/:id queda activo Formularios, no Configuración', () => {
    verLayout('/formularios/abc/resultados')
    expect(lateral().getByRole('link', { name: 'Formularios' })).toHaveAttribute('aria-current', 'page')
    expect(lateral().getByRole('link', { name: 'Configuración' })).not.toHaveAttribute('aria-current')
  })

  it('secretario: solo lectura, sin Personas ni Evaluación de evaluadores', () => {
    rol = 'secretario'
    verLayout('/decisiones')
    expect(enlaces()).toEqual(expect.arrayContaining(['Monitoreo', 'Decisiones', 'Comisiones', 'Formularios', 'Manual de usuario']))
    expect(enlaces()).not.toContain('Configuración')
    expect(enlaces()).not.toContain('Personas')
    expect(enlaces()).not.toContain('Evaluación de evaluadores')
  })

  it('EyC: su comisión, Formularios en el menú (sin Configuración) y el manual', () => {
    rol = 'eyc'
    verLayout('/comision')
    expect(enlaces()).toEqual(['Mi comisión', 'Formularios', 'Manual de usuario'])
  })

  it('EyC: dentro de /formularios/:id queda activo Formularios', () => {
    rol = 'eyc'
    verLayout('/formularios/abc/resultados')
    expect(lateral().getByRole('link', { name: 'Formularios' })).toHaveAttribute('aria-current', 'page')
  })

  it('todos los roles tienen Formularios en el menú', () => {
    for (const r of ['eyc', 'subsecretario', 'secretario', 'admin'] as const) {
      rol = r
      verLayout('/monitoreo')
      expect(enlaces()).toContain('Formularios')
      cleanup()
    }
  })

  it('admin ve todo', () => {
    rol = 'admin'
    verLayout('/monitoreo')
    expect(enlaces()).toEqual(expect.arrayContaining(['Personas', 'Evaluación de evaluadores', 'Configuración']))
  })
})

describe('Configuración: pestañas por rol', () => {
  const pestañas = () => screen.getAllByRole('tab').map((t) => t.textContent)
  const ver = (ruta = '/configuracion') =>
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="/formularios" element={<p>PANEL-FORMULARIOS</p>} />
        </Routes>
      </MemoryRouter>,
    )

  it('subsecretario: todas menos Cuentas', () => {
    rol = 'subsecretario'
    ver()
    expect(pestañas()).toEqual(['Fases y evento', 'Pesos y ponderaciones', 'Cortes y umbrales', 'Criterios de evaluación', 'Comisiones y catálogos', 'Auditoría'])
    expect(screen.getByText('PANEL-FASES')).toBeInTheDocument()
  })

  it('admin: incluye Cuentas y permisos', () => {
    rol = 'admin'
    ver()
    expect(pestañas()).toContain('Cuentas y permisos')
    expect(pestañas()).not.toContain('Formularios')
  })

  it('?tab=formularios ya no abre una pestaña: manda a Formularios', () => {
    rol = 'subsecretario'
    ver('/configuracion?tab=formularios')
    expect(screen.getByText('PANEL-FORMULARIOS')).toBeInTheDocument()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
  })

  it.each(['eyc', 'secretario'] as const)('%s: no entra a Configuración', (r) => {
    rol = r
    ver('/configuracion?tab=cuentas')
    expect(screen.getByText('PANEL-FORMULARIOS')).toBeInTheDocument()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.queryByText('PANEL-CUENTAS')).not.toBeInTheDocument()
  })

  it('subsecretario no abre Cuentas por URL', () => {
    rol = 'subsecretario'
    ver('/configuracion?tab=cuentas')
    expect(screen.queryByText('PANEL-CUENTAS')).not.toBeInTheDocument()
    expect(screen.getByText('PANEL-FASES')).toBeInTheDocument()
  })
})
