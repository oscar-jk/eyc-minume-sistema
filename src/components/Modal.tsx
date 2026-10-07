import { useEffect, useId, useRef, type ReactNode } from 'react'

/** Modal accesible sobre <dialog> nativo: atrapa el foco, cierra con Escape y devuelve el foco al cerrar. */
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
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink shadow-card backdrop:bg-black/50"
    >
      {abierto && (
        <div className="flex max-h-[85dvh] flex-col">
          <h2 id={idTitulo} className="px-5 pt-5 text-lg font-bold">
            {titulo}
          </h2>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {acciones && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{acciones}</div>}
        </div>
      )}
    </dialog>
  )
}
