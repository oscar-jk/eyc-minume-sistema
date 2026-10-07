import type { ReactNode } from 'react'

export function Tarjeta({
  titulo,
  accion,
  children,
  className = '',
}: {
  titulo?: ReactNode
  accion?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5 ${className}`}>
      {(titulo || accion) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-lg font-bold">{titulo}</h2>}
          {accion}
        </header>
      )}
      {children}
    </section>
  )
}

type TonoAviso = 'info' | 'alerta' | 'peligro' | 'exito'
const tonos: Record<TonoAviso, string> = {
  info: 'border-accent bg-accent-soft',
  alerta: 'border-amarillo bg-amarillo-bg',
  peligro: 'border-danger bg-danger-soft',
  exito: 'border-verde bg-verde-bg',
}

export function Aviso({ tono = 'info', titulo, children }: { tono?: TonoAviso; titulo?: ReactNode; children?: ReactNode }) {
  return (
    <div role={tono === 'peligro' ? 'alert' : 'status'} className={`rounded-xl border-l-4 px-4 py-3 text-sm text-ink ${tonos[tono]}`}>
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children && <div className={titulo ? 'mt-0.5 text-ink-2' : ''}>{children}</div>}
    </div>
  )
}

type TonoInsignia = 'neutro' | 'acento' | 'alerta' | 'peligro' | 'exito'
const tonosInsignia: Record<TonoInsignia, string> = {
  neutro: 'bg-surface-2 text-ink-2',
  acento: 'bg-accent-soft text-accent',
  alerta: 'bg-amarillo-bg text-amarillo',
  peligro: 'bg-rojo-bg text-rojo',
  exito: 'bg-verde-bg text-verde',
}

export function Insignia({ children, tono = 'neutro' }: { children: ReactNode; tono?: TonoInsignia }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 font-cond text-sm font-semibold ${tonosInsignia[tono]}`}>
      {children}
    </span>
  )
}

export function Titulo({ children, sub, accion }: { children: ReactNode; sub?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{children}</h1>
        {sub && <p className="mt-1 text-ink-2">{sub}</p>}
      </div>
      {accion}
    </div>
  )
}

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
    <div role="tablist" aria-label={etiqueta} className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
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
                const botones = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')
                botones?.[sig]?.focus()
              }
            }}
            className={`-mb-px min-h-11 shrink-0 whitespace-nowrap border-b-[3px] px-3 font-semibold ${
              activa ? 'border-accent text-accent' : 'border-transparent text-ink-2 hover:text-ink'
            }`}
          >
            {o.etiqueta}
          </button>
        )
      })}
    </div>
  )
}

/** Tabla con desplazamiento horizontal propio: la página nunca se desborda. */
export function Tabla({ children, etiqueta }: { children: ReactNode; etiqueta: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line" role="region" aria-label={etiqueta} tabIndex={0}>
      <table className="w-full min-w-[34rem] border-collapse text-left font-cond text-[0.95rem] [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-ink-2">
        {children}
      </table>
    </div>
  )
}

/** Fila de definición etiqueta/valor para fichas. */
export function Dato({ etiqueta, children }: { etiqueta: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-ink-3">{etiqueta}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  )
}
