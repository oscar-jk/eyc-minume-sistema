import { Outlet, useLocation } from 'react-router-dom'
import { CieloEstrellado } from '@/components/CieloEstrellado'
import { Destello } from '@/components/Elementos'
import { Marca } from '@/components/Marca'
import { useSesion } from '@/features/auth/AuthProvider'
import { useEstadoSitio } from '@/features/configuracion/api'

/**
 * Envuelve todas las rutas. Con el modo mantenimiento activo muestra una pantalla de espera a todos, menos a los administradores
 * (que siguen trabajando con un aviso arriba) y al inicio de sesión (para que un administrador pueda entrar a apagarlo).
 */
export function Mantenimiento() {
  const estado = useEstadoSitio()
  const { perfil, cargando } = useSesion()
  const { pathname } = useLocation()
  const activo = !!estado.data?.mantenimiento
  if (!activo) return <Outlet />

  if (perfil?.rol === 'admin') {
    return (
      <>
        <div role="status" className="sticky top-0 z-50 bg-grad-rosa px-4 py-2 text-center text-sm font-bold text-white shadow-card">
          Modo mantenimiento ACTIVO: el resto de las personas ve la pantalla de espera. Apágalo en Configuración › Fases y evento.
        </div>
        <Outlet />
      </>
    )
  }
  if (cargando) return null
  if (pathname.startsWith('/login')) {
    return (
      <>
        <div role="status" className="bg-grad-rosa px-4 py-2 text-center text-sm font-bold text-white">
          El sitio está en mantenimiento. Solo los administradores pueden entrar por ahora.
        </div>
        <Outlet />
      </>
    )
  }
  return <PantallaMantenimiento mensaje={estado.data?.mensaje ?? ''} />
}

export function PantallaMantenimiento({ mensaje }: { mensaje: string }) {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-grad-noche px-5 py-10 text-white">
      <CieloEstrellado densidad={1.3} />
      <div className="relative mx-auto flex max-w-lg flex-col items-center gap-5 text-center">
        <Marca tipo="lockup" blanco className="h-auto w-56" />
        <span aria-hidden className="grid size-16 place-items-center rounded-3xl rounded-tl-lg bg-grad-celeste text-white shadow-boton [animation:girar_30s_linear_infinite]">
          <Destello className="size-8" />
        </span>
        <h1 className="text-[clamp(1.8rem,6vw,2.6rem)] font-black leading-tight tracking-tight">
          Estamos mejorando <span className="acento font-normal">el</span> sitio
        </h1>
        <p className="text-lg text-white/85">{mensaje.trim() || 'El sistema está en mantenimiento. Espera unos momentos: esta pantalla se actualiza sola cuando todo esté listo.'}</p>
        <p className="font-cond text-sm font-semibold uppercase tracking-[0.14em] text-cian">No cierres esta página</p>
        <a href="/login" className="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline">
          Acceso de administración
        </a>
      </div>
    </main>
  )
}
