import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { mensajeError } from '@/lib/errores'
import { Boton } from './Boton'

export function Cargando({ texto = 'Cargando…', filas = 3 }: { texto?: string; filas?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2 py-2">
      <span className="sr-only">{texto}</span>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} aria-hidden className="h-12 animate-pulse rounded-lg bg-surface-2" />
      ))}
    </div>
  )
}

export function EstadoVacio({ titulo, children, accion }: { titulo: string; children?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-8 text-center">
      <p className="font-semibold text-ink">{titulo}</p>
      {children && <div className="max-w-md text-sm text-ink-2">{children}</div>}
      {accion}
    </div>
  )
}

export function EstadoError({ error, onReintentar }: { error: unknown; onReintentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-xl border border-danger bg-danger-soft px-4 py-3 text-ink">
      <p className="font-semibold text-danger">No se pudo cargar</p>
      <p className="text-sm">{mensajeError(error)}</p>
      {onReintentar && (
        <Boton variante="secundario" onClick={onReintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  )
}

/** Envuelve una consulta con sus estados de carga, error y vacío. */
export function Consulta<T>({
  q,
  vacio,
  esVacio,
  children,
  filas,
}: {
  q: UseQueryResult<T>
  vacio?: ReactNode
  esVacio?: (d: T) => boolean
  children: (d: T) => ReactNode
  filas?: number
}) {
  if (q.isPending) return <Cargando filas={filas} />
  if (q.isError) return <EstadoError error={q.error} onReintentar={() => q.refetch()} />
  const d = q.data as T
  const vacia = esVacio ? esVacio(d) : Array.isArray(d) && d.length === 0
  if (vacia && vacio) return <>{vacio}</>
  return <>{children(d)}</>
}
