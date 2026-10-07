import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Boton } from '@/components/Boton'
import { Cargando, EstadoError } from '@/components/Estados'
import { Aviso } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { salir } from '@/features/auth/api'
import { ESTADO_FASE } from '@/lib/formato'
import type { Fase, Rol } from '@/lib/tipos'

/** Exige sesión y un perfil con rol asignado. */
export function RequiereSesion() {
  const { sesion, perfil, cargando, recuperando, errorPerfil } = useSesion()
  const loc = useLocation()
  if (recuperando) return <Navigate to="/nueva-contrasena" replace />
  if (cargando)
    return (
      <div className="mx-auto max-w-md p-6">
        <Cargando texto="Verificando sesión…" />
      </div>
    )
  if (!sesion) return <Navigate to="/login" replace state={{ desde: loc.pathname }} />
  if (errorPerfil)
    return (
      <div className="mx-auto max-w-md p-6">
        <EstadoError error={errorPerfil} />
      </div>
    )
  if (!perfil?.rol || !perfil.activo)
    return (
      <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
        <Aviso tono="alerta" titulo="Tu cuenta no tiene acceso todavía">
          {perfil && !perfil.activo
            ? 'La cuenta está desactivada. Contacta a la Subsecretaría de Planificación y Desarrollo.'
            : 'Un administrador debe asignarte un rol (y una comisión si eres de EyC) antes de que puedas usar el sistema.'}
        </Aviso>
        <Boton variante="secundario" onClick={() => salir()}>
          Cerrar sesión
        </Boton>
      </main>
    )
  return <Outlet />
}

/** Exige uno de los roles indicados. */
export function RequiereRol({ roles, children }: { roles: Rol[]; children?: ReactNode }) {
  const { perfil } = useSesion()
  if (!perfil?.rol || !roles.includes(perfil.rol)) {
    return (
      <Aviso tono="peligro" titulo="Esta sección no es para tu rol" accion={{ texto: 'Ir a mi inicio', a: '/' }}>
        Esta sección no está disponible para tu rol.
      </Aviso>
    )
  }
  return children ? <>{children}</> : <Outlet />
}

/**
 * Guard por fase: la vista de escritura solo se renderiza si la fase está abierta.
 * Con la fase pendiente o cerrada se muestra el aviso (y opcionalmente una vista de solo lectura).
 */
export function SiFaseAbierta({ fase, children, soloLectura }: { fase: Fase | null | undefined; children: ReactNode; soloLectura?: ReactNode }) {
  const f = useAccionFase()
  if (fase?.estado === 'abierta') return <>{children}</>
  return (
    <div className="flex flex-col gap-4">
      <Aviso tono="alerta" accion={f.accion} titulo={fase ? `Fase "${fase.nombre}": ${ESTADO_FASE[fase.estado].toLowerCase()}` : 'Sin fase abierta'}>
        No se puede escribir en este período.{f.quien} {soloLectura ? 'Abajo puedes consultar lo registrado.' : ''}
      </Aviso>
      {soloLectura}
    </div>
  )
}

/** Ruta inicial según el rol. */
export function Inicio() {
  const { perfil } = useSesion()
  const destino: Record<Rol, string> = {
    eyc: '/comision',
    subsecretario: '/monitoreo',
    secretario: '/decisiones',
    admin: '/monitoreo',
  }
  return <Navigate to={perfil?.rol ? destino[perfil.rol] : '/login'} replace />
}

/** Acción para resolver un aviso de fase: quien gestiona va a Fases; el resto recibe a quién pedirlo. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAccionFase() {
  const { perfil } = useSesion()
  const gestiona = perfil?.rol === 'subsecretario' || perfil?.rol === 'admin'
  return {
    accion: gestiona ? { texto: 'Abrir o cambiar la fase', a: '/configuracion?tab=fases' } : null,
    quien: gestiona ? '' : ' Pide a la Subsecretaría de Planificación y Desarrollo que la abra.',
    gestiona,
  }
}
