import { Suspense, useState, type ComponentType, type SVGProps } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { CieloEstrellado } from '@/components/CieloEstrellado'
import { Cargando } from '@/components/Estados'
import { Destello } from '@/components/Elementos'
import { IcoComision, IcoComisiones, IcoConfig, IcoDecisiones, IcoManual, IcoLuna, IcoMas, IcoMonitoreo, IcoPersonas, IcoSalir, IcoSol } from '@/components/Iconos'
import { Marca } from '@/components/Marca'
import { Modal } from '@/components/Modal'
import { useSesion } from '@/features/auth/AuthProvider'
import { salir } from '@/features/auth/api'
import { ESTADO_FASE, ROL, fecha } from '@/lib/formato'
import type { Rol } from '@/lib/tipos'
import { useMomento } from './fase'
import { useTema } from './tema'

type Ico = ComponentType<SVGProps<SVGSVGElement>>
const NAV: { a: string; texto: string; corto: string; ico: Ico; roles: Rol[] }[] = [
  { a: '/comision', texto: 'Mi comisión', corto: 'Comisión', ico: IcoComision, roles: ['eyc'] },
  { a: '/monitoreo', texto: 'Monitoreo', corto: 'Monitoreo', ico: IcoMonitoreo, roles: ['subsecretario', 'secretario', 'admin'] },
  { a: '/decisiones', texto: 'Decisiones', corto: 'Decisiones', ico: IcoDecisiones, roles: ['subsecretario', 'secretario', 'admin'] },
  { a: '/comisiones', texto: 'Comisiones', corto: 'Comisiones', ico: IcoComisiones, roles: ['subsecretario', 'secretario', 'admin'] },
  { a: '/personas', texto: 'Personas', corto: 'Personas', ico: IcoPersonas, roles: ['subsecretario', 'admin'] },
  { a: '/configuracion', texto: 'Configuración', corto: 'Ajustes', ico: IcoConfig, roles: ['subsecretario', 'admin'] },
  { a: '/manual', texto: 'Manual de usuario', corto: 'Manual', ico: IcoManual, roles: ['eyc', 'subsecretario', 'secretario', 'admin'] },
]

/** Chip de estado de fase + día del evento; al tocarlo muestra todas las fases. */
function ChipFase({ compacto = false }: { compacto?: boolean }) {
  const m = useMomento()
  const [ver, setVer] = useState(false)
  if (m.cargando) return <span className="esqueleto block h-12 w-48 rounded-2xl" />
  const abierta = m.abiertas[0]
  return (
    <>
      <button
        type="button"
        onClick={() => setVer(true)}
        className={`group flex max-w-full items-center gap-3 text-left transition ${
          compacto
            ? 'min-h-10 rounded-2xl bg-accent-soft py-1.5 pl-2 pr-3 text-ink hover:brightness-95 dark:hover:brightness-125'
            : 'w-full rounded-2xl bg-white/10 p-2.5 text-white ring-1 ring-white/15 backdrop-blur hover:bg-white/15'
        }`}
        aria-label={abierta ? `Fase abierta: ${abierta.nombre}. Ver fases` : 'Ninguna fase abierta. Ver fases'}
      >
        <span
          aria-hidden
          className={`relative grid shrink-0 place-items-center rounded-xl ${compacto ? 'size-7' : 'size-9'} ${
            abierta ? 'bg-grad-celeste shadow-[0_0_18px_rgb(0_240_230/0.55)]' : 'bg-grad-rosa'
          }`}
        >
          <Destello className={`${compacto ? 'size-3.5' : 'size-4'} text-white ${abierta ? 'animate-[girar_8s_linear_infinite]' : ''}`} />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className={`font-cond text-[0.68rem] font-bold uppercase tracking-[0.14em] ${compacto ? 'text-acento' : 'text-cian'}`}>
            {abierta ? 'Fase abierta' : 'Solo lectura'}
            {m.diaEvento != null && ` · Día ${m.diaEvento} de ${m.diasEvento}`}
          </span>
          <span className="truncate font-bold">{abierta ? abierta.nombre : 'Ninguna fase abierta'}</span>
        </span>
      </button>
      <Modal abierto={ver} titulo="Fases del proceso" onCerrar={() => setVer(false)}>
        <ol className="flex flex-col gap-2">
          {m.fases.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
              <span aria-hidden className={`size-2.5 rounded-full ${f.estado === 'abierta' ? 'bg-verde' : f.estado === 'cerrada' ? 'bg-rojo' : 'bg-gris'}`} />
              <span className="flex-1 font-semibold">{f.nombre}</span>
              <span className="font-cond text-sm text-ink-3">
                {f.inicio ? fecha(f.inicio, true) : '—'} · {ESTADO_FASE[f.estado]}
              </span>
            </li>
          ))}
        </ol>
        {m.diaEvento != null && <p className="mt-3 text-sm text-ink-2">Hoy: {fecha(m.hoy)}</p>}
      </Modal>
    </>
  )
}

function BotonTema({ conTexto = false }: { conTexto?: boolean }) {
  const { tema, siguiente } = useTema()
  const Ico = tema === 'dark' ? IcoSol : IcoLuna
  return (
    <button
      type="button"
      onClick={siguiente}
      className="inline-flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold text-ink-2 hover:bg-accent-soft hover:text-ink"
      aria-label={tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      <Ico className="size-5" />
      {conTexto && <span>{tema === 'dark' ? 'Tema claro' : 'Tema oscuro'}</span>}
    </button>
  )
}

export function Layout() {
  const { perfil } = useSesion()
  const [mas, setMas] = useState(false)
  const items = NAV.filter((n) => perfil?.rol && n.roles.includes(perfil.rol))
  // En el teléfono caben 4 destinos; el resto va en «Más».
  const principales = items.length > 4 ? items.slice(0, 3) : items
  const resto = items.length > 4 ? items.slice(3) : []

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_1fr]">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 hidden opacity-60 dark:block">
        <CieloEstrellado densidad={0.45} />
      </div>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>

      {/* PC: barra lateral */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto bg-grad-noche px-4 py-6 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <Destello className="absolute right-6 top-24 size-3 text-cian/80" />
          <Destello className="absolute left-8 top-1/2 size-2 text-white/60" />
          <Destello className="absolute bottom-40 right-10 size-4 text-white/40" />
        </div>
        <NavLink to="/" className="relative px-2" aria-label="Inicio">
          <Marca tipo="lockup" blanco className="h-auto w-48" />
        </NavLink>
        <div className="relative px-2">
          <p className="sobretitulo mb-2 text-cian">Evaluación y Control</p>
          <ChipFase />
        </div>
        <nav aria-label="Secciones" className="relative flex-1">
          <ul className="flex flex-col gap-1">
            {items.map((i) => (
              <li key={i.a}>
                <NavLink
                  to={i.a}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center gap-3 rounded-2xl px-3 font-bold transition ${
                      isActive ? 'bg-white text-[#0043c5] shadow-[0_10px_30px_-10px_rgb(0_240_230/0.6)]' : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <i.ico className="size-5" />
                  {i.texto}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="relative rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
          <p className="truncate font-bold">{perfil?.nombre}</p>
          <p className="truncate font-cond text-sm text-white/70">{perfil?.rol && ROL[perfil.rol]}</p>
          <div className="mt-2 flex gap-1 [&_button]:text-white/85 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
            <BotonTema />
            <button type="button" onClick={() => salir()} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold">
              <IcoSalir className="size-5" /> Salir
            </button>
          </div>
        </div>
        <Marca tipo="estrellas" blanco className="relative mx-auto h-auto w-28 opacity-80" />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        {/* Teléfono y tableta: encabezado compacto */}
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl lg:hidden dark:bg-[#05054a]/80">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
            <NavLink to="/" aria-label="Inicio" className="shrink-0">
              <Marca tipo="lockup" className="h-7 w-auto" />
            </NavLink>
            <div className="ml-auto flex min-w-0 items-center gap-1">
              <div className="min-w-0 max-sm:hidden">
                <ChipFase compacto />
              </div>
              <BotonTema />
            </div>
          </div>
          <div className="border-t border-line px-4 py-2 sm:hidden">
            <ChipFase compacto />
          </div>
        </header>

        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-10 lg:pb-12">
          <Suspense fallback={<Cargando />}>
            <Outlet />
          </Suspense>
        </main>

        <footer className="mb-[72px] border-t border-line lg:mb-0">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-ink-3 sm:px-6 lg:px-10">
            <Marca tipo="footer" className="h-10 w-auto" />
            <p className="flex items-center gap-2">
              Sistema de Evaluación y Control · <span className="font-bold">MINUME</span> <span className="acento">de</span> <span className="font-bold">Estrellas</span>
            </p>
          </div>
        </footer>
      </div>

      {/* Teléfono y tableta: barra inferior al alcance del pulgar */}
      {items.length > 0 && (
        <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden dark:bg-[#05054a]/90">
          <ul className="mx-auto flex max-w-xl">
            {principales.map((i) => (
              <li key={i.a} className="flex-1">
                <NavLink
                  to={i.a}
                  className={({ isActive }) =>
                    `flex min-h-[64px] flex-col items-center justify-center gap-1 text-[0.72rem] font-bold ${isActive ? 'text-acento' : 'text-ink-3'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`grid h-8 w-14 place-items-center rounded-full transition ${isActive ? 'bg-grad-primario text-white shadow-boton' : ''}`}>
                        <i.ico className="size-5" />
                      </span>
                      {i.corto}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
            <li className="flex-1">
              <button type="button" onClick={() => setMas(true)} className="flex min-h-[64px] w-full flex-col items-center justify-center gap-1 text-[0.72rem] font-bold text-ink-3" aria-haspopup="dialog">
                <span className="grid h-8 w-14 place-items-center rounded-full">
                  <IcoMas className="size-6" />
                </span>
                Más
              </button>
            </li>
          </ul>
        </nav>
      )}

      <Modal abierto={mas} titulo={perfil?.nombre ?? 'Cuenta'} onCerrar={() => setMas(false)}>
        <p className="-mt-2 mb-3 font-cond text-ink-3">{perfil?.rol && ROL[perfil.rol]}</p>
        <ul className="flex flex-col gap-1">
          {resto.map((i) => (
            <li key={i.a}>
              <NavLink to={i.a} onClick={() => setMas(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold hover:bg-accent-soft">
                <i.ico className="size-5 text-acento" />
                {i.texto}
              </NavLink>
            </li>
          ))}
          <li>
            <BotonTema conTexto />
          </li>
          <li>
            <button type="button" onClick={() => salir()} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 font-bold text-danger hover:bg-danger-soft">
              <IcoSalir className="size-5" /> Cerrar sesión
            </button>
          </li>
        </ul>
      </Modal>
    </div>
  )
}
