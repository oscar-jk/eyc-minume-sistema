import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { CieloEstrellado } from '@/components/CieloEstrellado'
import { Destello } from '@/components/Elementos'
import { Marca } from '@/components/Marca'
import { reportarError } from '@/lib/errores'

/** Pantalla para fallos inesperados: amable para el usuario, con código de referencia para soporte. */
export function ErrorPagina() {
  const error = useRouteError()
  const noExiste = isRouteErrorResponse(error) && error.status === 404
  const a = noExiste ? { mensaje: 'Esta página no existe.', sugerencia: 'Puede que el enlace esté incompleto.', codigo: 'EYC-404' } : reportarError(error, 'pantalla')
  const esChunk = !noExiste && /dynamically imported module|Failed to fetch dynamically/i.test(String((error as Error)?.message ?? ''))

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-grad-noche px-5 text-center text-white">
      <CieloEstrellado />
      <div className="relative max-w-md">
        <Marca tipo="estrellas" blanco className="mx-auto h-12 w-auto" />
        <p className="mt-10 flex items-center justify-center gap-2 font-cond text-sm font-bold uppercase tracking-[0.2em] text-cian">
          <Destello className="size-4" /> Una estrella se desvió
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">
          {esChunk ? (
            <>
              Hay una versión <span className="acento font-normal">nueva</span>
            </>
          ) : (
            a.mensaje
          )}
        </h1>
        <p className="mt-3 text-white/80">{esChunk ? 'Recarga la página para usar la versión más reciente del sistema.' : a.sugerencia}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl bg-white px-5 font-bold text-[#0043c5]">
            Recargar
          </button>
          <Link to="/" className="inline-flex min-h-11 items-center rounded-xl bg-white/15 px-5 font-bold ring-1 ring-white/25">
            Ir al inicio
          </Link>
        </div>
        <p className="mt-8 font-cond text-xs font-bold uppercase tracking-wider text-white/60">Código de referencia: {a.codigo}</p>
      </div>
    </main>
  )
}
