import { useEffect, useState, type ReactNode } from 'react'

/** Prepara la base en memoria de la demostración y recién entonces muestra la app. */
export function PantallaDemo({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [detalle, setDetalle] = useState('')

  useEffect(() => {
    let vivo = true
    import('./motor')
      .then((m) => m.iniciar())
      .then(() => vivo && setEstado('listo'))
      .catch((e) => {
        console.error(e)
        if (vivo) {
          setDetalle(e instanceof Error ? e.message : String(e))
          setEstado('error')
        }
      })
    return () => {
      vivo = false
    }
  }, [])

  if (estado === 'listo') return <>{children}</>
  return (
    <main className="grid min-h-dvh place-items-center bg-grad-noche px-6 text-center text-white">
      <div className="flex max-w-md flex-col items-center gap-4">
        <p className="sobretitulo text-cian">Modo demostración</p>
        {estado === 'cargando' ? (
          <>
            <div aria-hidden className="size-10 animate-spin rounded-full border-4 border-white/25 border-t-white" />
            <h1 className="text-2xl font-black">Preparando la demostración…</h1>
            <p className="text-white/80">Se carga una copia de ejemplo con datos ficticios. Tarda unos segundos la primera vez; no usa ningún dato real.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black">No se pudo preparar la demostración</h1>
            <p className="text-white/80">{detalle}</p>
            <a href="/?demo=salir" className="rounded-xl bg-white px-5 py-3 font-bold text-[#0043c5]">
              Volver al sitio
            </a>
          </>
        )}
      </div>
    </main>
  )
}
