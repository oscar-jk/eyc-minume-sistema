import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Rol } from '@/lib/tipos'

let rol: Rol = 'subsecretario'
vi.mock('@/features/auth/AuthProvider', () => ({ useSesion: () => ({ perfil: { id: 'u1', nombre: 'Prueba', rol, activo: true } }) }))
vi.mock('@/features/auth/api', () => ({ salir: vi.fn() }))
vi.mock('@/app/fase', () => ({ useMomento: () => ({ cargando: true, abiertas: [], fases: [], cortes: [] }) }))
vi.mock('@/components/CieloEstrellado', () => ({ CieloEstrellado: () => null }))
vi.mock('@/features/formularios/FormulariosPage', () => ({ FormulariosPage: () => <p>PANEL-FORMULARIOS</p> }))
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

  it('Formularios ya no es un elemento del menú y Evaluación de evaluadores sí', () => {
    verLayout('/monitoreo')
    expect(enlaces()).not.toContain('Formularios')
    expect(enlaces()).toEqual(expect.arrayContaining(['Monitoreo', 'Decisiones', 'Comisiones', 'Personas', 'Evaluación de evaluadores', 'Configuración', 'Manual de usuario']))
  })

  it('agrupa por secciones y marca la sección activa', () => {
    verLayout('/monitoreo')
    for (const g of ['Seguimiento y control', 'Evaluación', 'Administración', 'Documentación']) expect(lateral().getByText(g)).toBeInTheDocument()
    expect(lateral().getByRole('link', { name: 'Monitoreo' })).toHaveAttribute('aria-current', 'page')
    expect(lateral().getByRole('link', { name: 'Decisiones' })).not.toHaveAttribute('aria-current')
  })

  it('dentro de /formularios/:id queda activa Configuración', () => {
    verLayout('/formularios/abc/resultados')
    expect(lateral().getByRole('link', { name: 'Configuración' })).toHaveAttribute('aria-current', 'page')
  })

  it('secretario: solo lectura, sin Personas ni Evaluación de evaluadores', () => {
    rol = 'secretario'
    verLayout('/decisiones')
    expect(enlaces()).toEqual(expect.arrayContaining(['Monitoreo', 'Decisiones', 'Comisiones', 'Configuración', 'Manual de usuario']))
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

  it('los demás roles no tienen Formularios en el menú: está dentro de Configuración', () => {
    for (const r of ['subsecretario', 'secretario', 'admin'] as const) {
      rol = r
      verLayout('/monitoreo')
      expect(enlaces()).not.toContain('Formularios')
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
        <ConfiguracionPage />
      </MemoryRouter>,
    )

  it('subsecretario: todas menos Cuentas', () => {
    rol = 'subsecretario'
    ver()
    expect(pestañas()).toEqual(['Fases y evento', 'Pesos y ponderaciones', 'Cortes y umbrales', 'Criterios de evaluación', 'Comisiones y catálogos', 'Auditoría', 'Formularios'])
    expect(screen.getByText('PANEL-FASES')).toBeInTheDocument()
  })

  it('admin: incluye Cuentas y permisos', () => {
    rol = 'admin'
    ver()
    expect(pestañas()).toContain('Cuentas y permisos')
    expect(pestañas()).toContain('Formularios')
  })

  it('?tab=formularios abre Formularios', () => {
    rol = 'subsecretario'
    ver('/configuracion?tab=formularios')
    expect(screen.getByText('PANEL-FORMULARIOS')).toBeInTheDocument()
  })

  it.each(['secretario'] as const)('%s: solo Formularios, aunque pida otra pestaña', (r) => {
    rol = r
    ver('/configuracion?tab=cuentas')
    expect(pestañas()).toEqual(['Formularios'])
    expect(screen.getByText('PANEL-FORMULARIOS')).toBeInTheDocument()
    expect(screen.queryByText('PANEL-CUENTAS')).not.toBeInTheDocument()
  })

  it('subsecretario no abre Cuentas por URL', () => {
    rol = 'subsecretario'
    ver('/configuracion?tab=cuentas')
    expect(screen.queryByText('PANEL-CUENTAS')).not.toBeInTheDocument()
    expect(screen.getByText('PANEL-FASES')).toBeInTheDocument()
  })
})
