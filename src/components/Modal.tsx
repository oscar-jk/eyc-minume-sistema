import { IcoCerrar } from './Iconos'
import { useEffect, useId, useRef, type PointerEvent as RPointerEvent, type ReactNode } from 'react'

/**
 * Modal accesible sobre <dialog> nativo. En el teléfono se presenta como hoja inferior
 * que se cierra arrastrándola hacia abajo desde la barrita o el encabezado; en tableta y PC, centrado.
 */
export function Modal({
  abierto,
  titulo,
  onCerrar,
  children,
  acciones,
}: {
  abierto: boolean
  titulo: ReactNode
  onCerrar: () => void
  children: ReactNode
  acciones?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const contenido = useRef<HTMLDivElement>(null)
  const idTitulo = useId()
  const arrastre = useRef<{ y0: number; t0: number; dy: number } | null>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) {
      d.showModal()
      d.style.transform = ''
      // Foco en el contenido (no en la ✕): sin anillo de foco inesperado al abrir.
      contenido.current?.focus({ preventScroll: true })
    }
    if (!abierto && d.open) d.close()
  }, [abierto])

  const esHoja = () => window.matchMedia('(max-width: 639px)').matches

  const iniciar = (e: RPointerEvent<HTMLDivElement>) => {
    if (!esHoja() || (e.target as HTMLElement).closest('button')) return
    arrastre.current = { y0: e.clientY, t0: performance.now(), dy: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
    if (ref.current) ref.current.style.transition = 'none'
  }
  const mover = (e: RPointerEvent<HTMLDivElement>) => {
    const a = arrastre.current
    if (!a || !ref.current) return
    a.dy = Math.max(0, e.clientY - a.y0)
    ref.current.style.transform = `translateY(${a.dy}px)`
  }
  const soltar = () => {
    const a = arrastre.current
    const d = ref.current
    arrastre.current = null
    if (!a || !d) return
    const velocidad = a.dy / Math.max(1, performance.now() - a.t0)
    d.style.transition = 'transform 0.22s ease'
    if (a.dy > Math.min(140, d.offsetHeight * 0.3) || velocidad > 0.6) {
      d.style.transform = 'translateY(100%)'
      setTimeout(onCerrar, 200)
    } else {
      d.style.transform = ''
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar()
      }}
      className="m-0 mt-auto w-full max-w-none rounded-t-3xl border border-line bg-surface p-0 text-ink shadow-card backdrop:bg-[#05054a]/60 backdrop:backdrop-blur-sm open:animate-[subir_.28s_ease] sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-3xl sm:open:animate-[aparecer_.2s_ease]"
    >
      {abierto && (
        <div ref={contenido} tabIndex={-1} className="flex max-h-[88dvh] flex-col outline-none">
          {/* Zona de arrastre: barrita + encabezado */}
          <div onPointerDown={iniciar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} className="touch-none select-none sm:touch-auto sm:select-auto">
            <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-12 cursor-grab rounded-full bg-line-strong/50 sm:hidden" />
            <div className="flex items-start justify-between gap-3 px-5 pt-4 sm:pt-5">
              <h2 id={idTitulo} className="text-xl font-extrabold leading-tight">
                {titulo}
              </h2>
              <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
                <IcoCerrar className="size-5" aria-hidden />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {acciones && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>button]:flex-1 sm:[&>button]:flex-none">
              {acciones}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
