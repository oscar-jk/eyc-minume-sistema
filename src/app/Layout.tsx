import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Cargando } from '@/components/Estados'
import { Marca } from '@/components/Marca'
import { useSesion } from '@/features/auth/AuthProvider'
import { salir } from '@/features/auth/api'
import { ESTADO_FASE, ROL, fecha } from '@/lib/formato'
import type { Rol } from '@/lib/tipos'
import { useMomento } from './fase'
import { useTema } from './tema'

const NAV: { a: string; texto: string; roles: Rol[] }[] = [
  { a: '/comision', texto: 'Mi comisión', roles: ['eyc'] },
  { a: '/monitoreo', texto: 'Monitoreo', roles: ['subsecretario', 'secretario', 'admin'] },
  { a: '/decisiones', texto: 'Decisiones', roles: ['subsecretario', 'secretario', 'admin'] },
  { a: '/comisiones', texto: 'Comisiones', roles: ['subsecretario', 'secretario', 'admin'] },
  { a: '/personas', texto: 'Personas', roles: ['subsecretario', 'admin'] },
  { a: '/configuracion', texto: 'Configuración', roles: ['subsecretario', 'admin'] },
]

const TEMA_TEXTO = { sistema: 'Tema: sistema', light: 'Tema: claro', dark: 'Tema: oscuro' } as const

/** Fase activa, su estado y el día del evento: visibles en todas las vistas. */
function BarraFase() {
  const m = useMomento()
  if (m.cargando) return <div className="h-9" aria-hidden />
  const cerrada = m.abiertas.length === 0
  return (
    <div
      role="status"
      className={`border-b border-line ${cerrada ? 'bg-amarillo-bg' : 'bg-surface-2'}`}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 font-cond text-[0.95rem]">
        {cerrada ? (
          <span className="font-semibold text-amarillo">
            Ninguna fase abierta{m.vigente ? ` · última: ${m.vigente.nombre} (${ESTADO_FASE[m.vigente.estado].toLowerCase()})` : ''} — no se puede escribir
          </span>
        ) : (
          m.abiertas.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <span aria-hidden className="size-2 rounded-full bg-verde" />
              {f.nombre} <span className="font-medium text-ink-2">· abierta</span>
            </span>
          ))
        )}
        {m.diaEvento != null && (
          <span className="ml-auto font-semibold text-accent">
            Día {m.diaEvento} de {m.diasEvento} · {fecha(m.hoy, true)}
          </span>
        )}
      </div>
    </div>
  )
}

export function Layout() {
  const { perfil } = useSesion()
  const { tema, siguiente } = useTema()
  const items = NAV.filter((n) => perfil?.rol && n.roles.includes(perfil.rol))

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <NavLink to="/" className="shrink-0" aria-label="Inicio">
            <Marca tipo="login" className="h-6 w-auto sm:h-8" />
          </NavLink>
          <div className="ml-auto flex items-center gap-1">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold">{perfil?.nombre}</p>
              <p className="font-cond text-xs text-ink-3">{perfil?.rol && ROL[perfil.rol]}</p>
            </div>
            <button
              type="button"
              onClick={siguiente}
              className="grid size-11 place-items-center rounded-lg text-ink-2 hover:bg-surface-2"
              aria-label={`${TEMA_TEXTO[tema]}. Cambiar tema`}
              title={TEMA_TEXTO[tema]}
            >
              <span aria-hidden className="text-lg">{tema === 'dark' ? '☾' : tema === 'light' ? '☀' : '◐'}</span>
            </button>
            <button type="button" onClick={() => salir()} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-accent hover:bg-accent-soft">
              Salir
            </button>
          </div>
        </div>
        {items.length > 1 && (
          <nav aria-label="Secciones" className="mx-auto max-w-6xl overflow-x-auto px-2">
            <ul className="flex gap-1">
              {items.map((i) => (
                <li key={i.a}>
                  <NavLink
                    to={i.a}
                    className={({ isActive }) =>
                      `inline-flex min-h-11 items-center whitespace-nowrap border-b-[3px] px-3 font-semibold ${
                        isActive ? 'border-accent text-accent' : 'border-transparent text-ink-2 hover:text-ink'
                      }`
                    }
                  >
                    {i.texto}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <BarraFase />
      </header>

      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-28 sm:py-8">
        <Suspense fallback={<Cargando />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-ink-3">
          <Marca tipo="footer" className="h-10 w-auto" />
          <p>Sistema de Evaluación y Control · MINUME XVII</p>
        </div>
      </footer>
    </div>
  )
}
