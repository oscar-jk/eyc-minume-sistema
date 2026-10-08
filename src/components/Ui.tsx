import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CieloEstrellado } from './CieloEstrellado'
import { Bloques, Circulos, Damero, Destello, Estrella8, Flor } from './Elementos'
import { IcoFlechaDerecha } from './Iconos'

export function Tarjeta({
  titulo,
  accion,
  children,
  className = '',
  destacada = false,
}: {
  titulo?: ReactNode
  accion?: ReactNode
  children: ReactNode
  className?: string
  destacada?: boolean
}) {
  return (
    <section
      className={`animar-entrada relative overflow-hidden rounded-[28px] rounded-tr-[6px] border bg-surface p-4 shadow-card sm:p-6 dark:bg-vidrio dark:backdrop-blur-xl ${
        destacada ? 'border-transparent [background:linear-gradient(var(--surface),var(--surface))_padding-box,var(--grad-primario)_border-box]' : 'border-line'
      } ${className}`}
    >
      <span aria-hidden className="pointer-events-none absolute left-6 right-16 top-0 h-[3px] rounded-b-full bg-grad-primario opacity-80 dark:bg-grad-celeste" />
      <Damero tono="azul" aria-hidden className="pointer-events-none absolute -right-3 -top-3 size-16 opacity-[0.1] [mask-image:radial-gradient(closest-side,#000_20%,transparent_100%)] [-webkit-mask-image:radial-gradient(closest-side,#000_20%,transparent_100%)] dark:opacity-[0.16]" />
      {(titulo || accion) && (
        <header className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          {titulo && (
            <h2 className="flex items-center gap-2.5 text-lg font-black tracking-tight sm:text-xl">
              <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-lg rounded-tr-sm bg-grad-primario shadow-boton">
                <Destello className="size-3.5 text-white" />
              </span>
              {titulo}
            </h2>
          )}
          {accion}
        </header>
      )}
      <div className="relative">{children}</div>
    </section>
  )
}

/** Palabra de acento en Libre Baskerville itálica (como «de» en MINUME de ESTRELLAS). */
export function Acento({ children }: { children: ReactNode }) {
  return <span className="acento font-normal">{children}</span>
}

type Adorno = 'circulos' | 'damero' | 'bloques' | 'flor'
const ADORNOS: Record<Adorno, (c: string) => ReactNode> = {
  circulos: (c) => <Circulos tono="celeste" className={c} />,
  damero: (c) => <Damero tono="celeste" className={c} />,
  bloques: (c) => <Bloques tono="celeste" className={c} />,
  flor: (c) => <Flor tono="rosa" className={c} />,
}

/**
 * Encabezado de página con impacto: banda en degradado de marca, sobretítulo,
 * título grande con acento itálico y un elemento gráfico de la identidad.
 */
export function Titulo({
  children,
  sub,
  accion,
  sobre,
  adorno = 'circulos',
  extra,
}: {
  children: ReactNode
  sub?: ReactNode
  accion?: ReactNode
  sobre?: ReactNode
  adorno?: Adorno
  extra?: ReactNode
}) {
  return (
    <header className="animar-entrada relative isolate mb-6 overflow-hidden rounded-3xl bg-grad-heroe px-5 py-6 text-white shadow-card sm:px-8 sm:py-8">
      <CieloEstrellado densidad={1.6} className="-z-10" />
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-10 w-60 rotate-6 opacity-35 mix-blend-screen [mask-image:radial-gradient(closest-side,#000_35%,transparent_100%)] [-webkit-mask-image:radial-gradient(closest-side,#000_35%,transparent_100%)] sm:w-80">
        {ADORNOS[adorno]('w-full h-auto')}
      </div>
      <Destello aria-hidden className="pointer-events-none absolute bottom-4 right-1/3 size-4 text-white/70" />
      <Destello aria-hidden className="pointer-events-none absolute right-12 top-1/2 size-2.5 text-cian" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {sobre && <p className="sobretitulo mb-1 text-cian">{sobre}</p>}
          <h1 className="text-[clamp(1.9rem,6vw,3rem)] font-black leading-[1.02] tracking-tight">{children}</h1>
          {sub && <p className="mt-2 max-w-2xl text-[0.98rem] text-white/85">{sub}</p>}
        </div>
        {accion}
      </div>
      {extra && <div className="relative mt-5">{extra}</div>}
    </header>
  )
}

type TonoAviso = 'info' | 'alerta' | 'peligro' | 'exito'
const tonos: Record<TonoAviso, { caja: string; chip: string; etiqueta: string; txt: string }> = {
  info: { caja: 'bg-accent-soft ring-accent/20', chip: 'bg-grad-primario', etiqueta: 'Información', txt: 'text-acento' },
  alerta: { caja: 'bg-amarillo-bg ring-amarillo/25', chip: 'bg-gradient-to-br from-[#f5a300] to-[#ffd84d]', etiqueta: 'Atención', txt: 'text-amarillo' },
  peligro: { caja: 'bg-danger-soft ring-danger/25', chip: 'bg-grad-rosa', etiqueta: 'Importante', txt: 'text-danger' },
  exito: { caja: 'bg-verde-bg ring-verde/25', chip: 'bg-gradient-to-br from-[#14a34a] to-[#6ee7a0]', etiqueta: 'Listo', txt: 'text-verde' },
}

/** Acción que lleva a donde se resuelve el aviso (ruta o función). */
export interface AccionAviso {
  texto: string
  a?: string
  onClick?: () => void
}

export function Aviso({ tono = 'info', titulo, children, accion }: { tono?: TonoAviso; titulo?: ReactNode; children?: ReactNode; accion?: AccionAviso | false | null }) {
  const t = tonos[tono]
  const Icono = tono === 'peligro' ? Estrella8 : tono === 'exito' ? Destello : tono === 'alerta' ? Flor : Destello
  return (
    <div role={tono === 'peligro' ? 'alert' : 'status'} className={`relative flex gap-3 overflow-hidden rounded-2xl rounded-tl-[6px] p-3.5 text-sm text-ink ring-1 ${t.caja}`}>
      <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-xl rounded-tl-sm text-white shadow-sm ${t.chip}`}>
        <Icono tono="actual" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-cond text-[0.7rem] font-bold uppercase tracking-[0.14em] ${t.txt}`}>{t.etiqueta}</p>
        {titulo && <p className="text-[0.95rem] font-extrabold leading-snug">{titulo}</p>}
        {children && <div className="mt-0.5 text-ink-2">{children}</div>}
        {accion &&
          (accion.a ? (
            <Link to={accion.a} className={claseAccion}>
              {accion.texto} <IcoFlechaDerecha className="size-4" aria-hidden />
            </Link>
          ) : (
            <button type="button" onClick={accion.onClick} className={claseAccion}>
              {accion.texto} <IcoFlechaDerecha className="size-4" aria-hidden />
            </button>
          ))}
      </div>
    </div>
  )
}

const claseAccion =
  'mt-2.5 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-grad-primario px-3.5 text-sm font-bold text-white shadow-boton transition hover:-translate-y-px hover:brightness-110'

type TonoInsignia = 'neutro' | 'acento' | 'alerta' | 'peligro' | 'exito'
const tonosInsignia: Record<TonoInsignia, string> = {
  neutro: 'bg-surface-2 text-ink-2',
  acento: 'bg-accent-soft text-acento',
  alerta: 'bg-amarillo-bg text-amarillo',
  peligro: 'bg-rojo-bg text-rojo',
  exito: 'bg-verde-bg text-verde',
}

export function Insignia({ children, tono = 'neutro' }: { children: ReactNode; tono?: TonoInsignia }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 font-cond text-sm font-bold ${tonosInsignia[tono]}`}>
      {children}
    </span>
  )
}

/** Control segmentado tipo píldora; en móvil se desplaza horizontalmente. */
export function Pestanas<T extends string>({
  valor,
  onCambio,
  opciones,
  etiqueta,
}: {
  valor: T
  onCambio: (v: T) => void
  opciones: { valor: T; etiqueta: ReactNode }[]
  etiqueta: string
}) {
  return (
    <div className="-mx-4 mb-5 overflow-x-auto px-4 sin-scrollbar sm:mx-0 sm:px-0">
      <div role="tablist" aria-label={etiqueta} className="inline-flex gap-1 rounded-2xl border border-line bg-surface p-1 shadow-card dark:bg-vidrio">
        {opciones.map((o) => {
          const activa = o.valor === valor
          return (
            <button
              key={o.valor}
              role="tab"
              type="button"
              aria-selected={activa}
              tabIndex={activa ? 0 : -1}
              onClick={() => onCambio(o.valor)}
              onKeyDown={(e) => {
                const i = opciones.findIndex((x) => x.valor === valor)
                let sig = -1
                if (e.key === 'ArrowRight') sig = (i + 1) % opciones.length
                if (e.key === 'ArrowLeft') sig = (i - 1 + opciones.length) % opciones.length
                if (sig >= 0) {
                  onCambio(opciones[sig].valor)
                  e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[sig]?.focus()
                }
              }}
              className={`min-h-10 shrink-0 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition-all ${
                activa ? 'bg-grad-primario text-white shadow-boton' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {o.etiqueta}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Tabla con desplazamiento horizontal propio: la página nunca se desborda. */
export function Tabla({ children, etiqueta }: { children: ReactNode; etiqueta: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line" role="region" aria-label={etiqueta} tabIndex={0}>
      <table className="w-full min-w-[34rem] border-collapse text-left font-cond text-[0.98rem] [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-3 [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-ink-3 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-accent-soft/40">
        {children}
      </table>
    </div>
  )
}

export function Dato({ etiqueta, children }: { etiqueta: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-ink-3">{etiqueta}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  )
}

/** Cifra destacada (KPI) para héroes y resúmenes. */
export function Cifra({ valor, etiqueta, tono = 'claro' }: { valor: ReactNode; etiqueta: ReactNode; tono?: 'claro' | 'normal' }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${tono === 'claro' ? 'bg-white/12 backdrop-blur ring-1 ring-white/20' : 'bg-surface-2'}`}>
      <p className="font-cond text-3xl font-extrabold leading-none tabular">{valor}</p>
      <p className={`mt-1 text-xs font-semibold uppercase tracking-wider ${tono === 'claro' ? 'text-white/80' : 'text-ink-3'}`}>{etiqueta}</p>
    </div>
  )
}

/** Fila de lista táctil (toda la fila es un objetivo grande). */
export function Fila({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-all hover:-translate-y-px hover:border-accent hover:shadow-card dark:bg-white/[0.04] ${className}`}
    >
      {children}
    </li>
  )
}
