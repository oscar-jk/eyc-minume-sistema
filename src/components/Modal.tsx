import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * Modal accesible sobre <dialog> nativo. En el teléfono se presenta como hoja inferior
 * (al alcance del pulgar); en tableta y PC, centrado.
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
  const idTitulo = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

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
        <div className="flex max-h-[88dvh] flex-col">
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-line-strong/50 sm:hidden" />
          <div className="flex items-start justify-between gap-3 px-5 pt-4 sm:pt-5">
            <h2 id={idTitulo} className="text-xl font-extrabold leading-tight">
              {titulo}
            </h2>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2">
              <span aria-hidden className="text-xl leading-none">
                ×
              </span>
            </button>
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
