/* eslint-disable react-refresh/only-export-components -- módulo de rutas, no de componentes */
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Link } from 'react-router-dom'
import { EstadoVacio } from '@/components/Estados'
import { LoginPage, NuevaContrasenaPage, RecuperarPage } from '@/features/auth/paginas'
import { Inicio, RequiereRol, RequiereSesion } from './guards'
import { ErrorPagina } from './ErrorPagina'
import { Layout } from './Layout'

// Carga diferida por sección: el EyC en el teléfono solo descarga lo que usa.
const ComisionPage = lazy(() => import('@/features/comisiones/ComisionPage').then((m) => ({ default: m.ComisionPage })))
const ComisionesPage = lazy(() => import('@/features/comisiones/ComisionesPage').then((m) => ({ default: m.ComisionesPage })))
const NuevaEvaluacionPage = lazy(() => import('@/features/evaluacion/EvaluarPage').then((m) => ({ default: m.NuevaEvaluacionPage })))
const EvaluacionPage = lazy(() => import('@/features/evaluacion/EvaluarPage').then((m) => ({ default: m.EvaluacionPage })))
const MonitoreoPage = lazy(() => import('@/features/monitoreo/MonitoreoPage').then((m) => ({ default: m.MonitoreoPage })))
const DecisionesPage = lazy(() => import('@/features/continuidad/DecisionesPage').then((m) => ({ default: m.DecisionesPage })))
const FichaPage = lazy(() => import('@/features/personas/FichaPage').then((m) => ({ default: m.FichaPage })))
const PersonasPage = lazy(() => import('@/features/personas/PersonasPage').then((m) => ({ default: m.PersonasPage })))
const ManualPage = lazy(() => import('@/features/manual/ManualPage').then((m) => ({ default: m.ManualPage })))
const ConfiguracionPage = lazy(() => import('@/features/configuracion/ConfiguracionPage').then((m) => ({ default: m.ConfiguracionPage })))

const PRIV = ['subsecretario', 'secretario', 'admin'] as const
const GESTION = ['subsecretario', 'admin'] as const

function NoEncontrada() {
  return (
    <EstadoVacio titulo="Página no encontrada">
      <Link to="/" className="font-bold text-acento">
        Ir al inicio
      </Link>
    </EstadoVacio>
  )
}

export const router = createBrowserRouter([
  {
    errorElement: <ErrorPagina />,
    children: [
  { path: '/login', element: <LoginPage /> },
  { path: '/recuperar', element: <RecuperarPage /> },
  { path: '/nueva-contrasena', element: <NuevaContrasenaPage /> },
  { path: '/manual', element: <Suspense fallback={null}><ManualPage /></Suspense> },
  {
    element: <RequiereSesion />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Inicio /> },
          { path: 'comision', element: <RequiereRol roles={['eyc']}><ComisionPage /></RequiereRol> },
          { path: 'comisiones', element: <RequiereRol roles={[...PRIV]}><ComisionesPage /></RequiereRol> },
          { path: 'comisiones/:id', element: <RequiereRol roles={[...PRIV]}><ComisionPage /></RequiereRol> },
          { path: 'evaluar', element: <RequiereRol roles={['eyc', 'subsecretario', 'admin']}><NuevaEvaluacionPage /></RequiereRol> },
          { path: 'evaluaciones/:id', element: <EvaluacionPage /> },
          { path: 'monitoreo', element: <RequiereRol roles={[...PRIV]}><MonitoreoPage /></RequiereRol> },
          { path: 'decisiones', element: <RequiereRol roles={[...PRIV]}><DecisionesPage /></RequiereRol> },
          { path: 'personas', element: <RequiereRol roles={[...GESTION]}><PersonasPage /></RequiereRol> },
          { path: 'personas/:id', element: <FichaPage /> },
          { path: 'configuracion', element: <RequiereRol roles={[...GESTION]}><ConfiguracionPage /></RequiereRol> },
          { path: '*', element: <NoEncontrada /> },
        ],
      },
    ],
  },
    ],
  },
])
