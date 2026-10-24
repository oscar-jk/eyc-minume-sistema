import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Boton } from '@/components/Boton'
import { CieloEstrellado } from '@/components/CieloEstrellado'
import { Cargando } from '@/components/Estados'
import { Destello } from '@/components/Elementos'
import { Marca } from '@/components/Marca'
import { Acento, Aviso } from '@/components/Ui'
import { interpretarError, reportarError } from '@/lib/errores'
import { useEnviarFormulario, useFormularioPublico } from './api'
import { FormularioRespuesta } from './FormularioRespuesta'

/** Página pública: se entra con el enlace o el QR, sin cuenta; se responde y se sale. */
export function FormularioPublicoPage() {
  const { codigo } = useParams()
  const q = useFormularioPublico(codigo)
  const enviar = useEnviarFormulario(codigo ?? '')
  const [enviado, setEnviado] = useState(false)
  const [vuelta, setVuelta] = useState(0)

  return (
    <main className="min-h-dvh">
      <header className="relative isolate overflow-hidden bg-grad-noche px-5 pb-20 pt-8 text-white">
        <CieloEstrellado />
        <div className="relative mx-auto flex max-w-xl items-center justify-between gap-4">
          <Marca tipo="lockup" blanco className="h-auto w-44" />
          <p className="flex items-center gap-2 font-black tracking-tight">
            <Destello className="size-4 text-cian" />
            <span className="text-sm">MINUME XVII</span>
          </p>
        </div>
        <div className="relative mx-auto mt-8 max-w-xl">
          <p className="sobretitulo text-cian">Tu opinión cuenta</p>
          <h1 className="mt-1 text-[clamp(1.8rem,7vw,2.6rem)] font-black leading-tight tracking-tight">{q.data?.titulo ?? <Acento>Formulario</Acento>}</h1>
          {q.data?.descripcion && <p className="mt-2 text-white/80">{q.data.descripcion}</p>}
        </div>
      </header>

      <section className="relative -mt-12 px-4 pb-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7 dark:bg-vidrio dark:backdrop-blur-xl">
          {q.isPending ? (
            <Cargando filas={4} />
          ) : q.isError ? (
            <Aviso tono="alerta" titulo="Este formulario no está disponible">
              El enlace puede estar incompleto o el formulario ya se cerró. Pide el enlace de nuevo a quien te lo compartió.
            </Aviso>
          ) : enviado ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span aria-hidden className="grid size-16 place-items-center rounded-3xl rounded-tl-lg bg-grad-celeste text-white shadow-boton">
                <Destello className="size-8" />
              </span>
              <h2 className="text-2xl font-black tracking-tight">
                ¡Gracias <Acento>por</Acento> responder!
              </h2>
              <p className="text-ink-2">Tu respuesta quedó registrada. Puedes cerrar esta página.</p>
              <Boton
                variante="secundario"
                onClick={() => {
                  setEnviado(false)
                  setVuelta((v) => v + 1)
                  enviar.reset()
                }}
              >
                Responder otra vez
              </Boton>
            </div>
          ) : (
            <FormularioRespuesta
              key={vuelta}
              def={q.data}
              codigo={codigo}
              enviando={enviar.isPending}
              errorEnvio={enviar.isError ? interpretarError(enviar.error).mensaje + (interpretarError(enviar.error).sugerencia ? ' ' + interpretarError(enviar.error).sugerencia : '') : null}
              onEnviar={(p) =>
                enviar.mutate(p, {
                  onSuccess: () => setEnviado(true),
                  onError: (e) => reportarError(e, 'formulario público'),
                })
              }
            />
          )}
        </div>
        <p className="mx-auto mt-6 max-w-xl text-center font-serif text-xs italic text-ink-3">
          Sistema de Evaluación y Control · MINUME <span className="font-serif">de</span> Estrellas
        </p>
      </section>
    </main>
  )
}
