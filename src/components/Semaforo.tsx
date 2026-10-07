import { SEMAFORO, plural, puntaje as fmtPuntaje } from '@/lib/formato'
import type { Semaforo as TSemaforo } from '@/lib/tipos'

const estilos: Record<TSemaforo, { punto: string; caja: string }> = {
  verde: { punto: 'bg-verde', caja: 'bg-verde-bg text-verde' },
  amarillo: { punto: 'bg-amarillo', caja: 'bg-amarillo-bg text-amarillo' },
  rojo: { punto: 'bg-rojo', caja: 'bg-rojo-bg text-rojo' },
  gris: { punto: 'bg-gris', caja: 'bg-gris-bg text-gris' },
}

/**
 * Semáforo que nunca depende solo del color: punto + etiqueta + puntaje + cantidad de evaluaciones.
 * Todos los valores llegan calculados desde la base.
 */
export function Semaforo({
  semaforo,
  puntaje,
  n,
  compacto = false,
}: {
  semaforo: TSemaforo | null | undefined
  puntaje?: number | null
  n?: number | null
  compacto?: boolean
}) {
  const s = semaforo ?? 'gris'
  const e = estilos[s]
  const cuantas = n ?? 0
  const detalle = plural(cuantas, 'evaluación', 'evaluaciones')
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-cond text-sm font-semibold ${e.caja}`}
      title={`${SEMAFORO[s].significado} · ${detalle}`}
    >
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${e.punto}`} />
      <span>{SEMAFORO[s].etiqueta}</span>
      {s !== 'gris' && <span className="tabular">{fmtPuntaje(puntaje)}</span>}
      {compacto ? (
        <span className="tabular font-medium opacity-90">
          <span aria-hidden>({cuantas})</span>
          <span className="sr-only">{detalle}</span>
        </span>
      ) : (
        <span className="font-medium opacity-90">· {detalle}</span>
      )}
    </span>
  )
}
