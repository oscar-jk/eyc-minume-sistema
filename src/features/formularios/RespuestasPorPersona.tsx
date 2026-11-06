import { Insignia } from '@/components/Ui'
import { fechaHora } from '@/lib/formato'
import { identidadDe, respondidas, type CampoMin, type EnvioMin } from './filtrarRespuestas'
import { ROLES_RESPUESTA } from './tipos'

/** Una tarjeta por llenada del formulario: quién respondió y de dónde; al tocarla se abren todas sus respuestas. */
export function RespuestasPorPersona({
  envios,
  campos,
  comision,
  onAbrir,
}: {
  envios: EnvioMin[]
  campos: CampoMin[]
  comision: (id: number | null) => string
  onAbrir: (id: string) => void
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {envios.map((e, n) => {
        const { nombre, correo } = identidadDe(e, campos)
        const hechas = respondidas(e, campos)
        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onAbrir(e.id)}
              aria-label={`Ver todas las respuestas de ${nombre || `la respuesta ${n + 1}`}`}
              className="flex h-full w-full flex-col gap-2 rounded-2xl border border-line bg-surface p-4 text-left transition-all hover:-translate-y-px hover:border-accent hover:shadow-card dark:bg-white/[0.04]"
            >
              <span className="font-cond text-xs font-bold uppercase tracking-wider text-acento">Respuesta {n + 1}</span>
              <span className="break-words text-lg font-extrabold leading-tight">{nombre || 'Sin nombre'}</span>
              {correo && <span className="break-all text-sm text-ink-3">{correo}</span>}
              <span className="flex flex-wrap gap-1.5">
                {e.rol && <Insignia tono="acento">{ROLES_RESPUESTA[e.rol] ?? e.rol}</Insignia>}
                {e.comision_id != null && <Insignia>{comision(e.comision_id)}</Insignia>}
                {e.referencia && <Insignia>{e.referencia}</Insignia>}
              </span>
              <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-sm text-ink-2">
                <span className="tabular">{fechaHora(e.creado_en)}</span>
                <span className="font-bold text-acento">
                  {hechas} de {campos.length} · Ver todas →
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
