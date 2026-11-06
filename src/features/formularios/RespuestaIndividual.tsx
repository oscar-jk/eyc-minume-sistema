import { useEffect } from 'react'
import { Boton } from '@/components/Boton'
import { Modal } from '@/components/Modal'
import { Insignia } from '@/components/Ui'
import { fechaHora } from '@/lib/formato'
import { identidadDe, textoRespuesta, type CampoMin, type EnvioMin } from './filtrarRespuestas'
import { ROLES_RESPUESTA, TIPOS_CAMPO } from './tipos'

/** Una sola llenada del formulario, completa, con flechas para pasar a la anterior o a la siguiente (dentro de lo filtrado). */
export function RespuestaIndividual({
  envios,
  idActual,
  campos,
  comision,
  onCambiar,
  onCerrar,
}: {
  envios: EnvioMin[]
  idActual: string | null
  campos: CampoMin[]
  comision: (id: number | null) => string
  onCambiar: (id: string) => void
  onCerrar: () => void
}) {
  const i = idActual ? envios.findIndex((e) => e.id === idActual) : -1
  const e = i >= 0 ? envios[i] : null
  const quien = e ? identidadDe(e, campos) : { nombre: '', correo: '' }
  const ir = (d: number) => {
    const n = envios[i + d]
    if (n) onCambiar(n.id)
  }

  useEffect(() => {
    if (!e) return
    const tecla = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return
      if (ev.key === 'ArrowLeft') ir(-1)
      if (ev.key === 'ArrowRight') ir(1)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e?.id, envios])

  return (
    <Modal
      abierto={!!e}
      titulo={e ? `Respuesta ${i + 1} de ${envios.length}` : 'Respuesta'}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={() => ir(-1)} disabled={i <= 0}>
            ← Anterior
          </Boton>
          <Boton variante="secundario" onClick={() => ir(1)} disabled={i < 0 || i >= envios.length - 1}>
            Siguiente →
          </Boton>
        </>
      }
    >
      {e && (
        <div className="flex flex-col gap-4">
          {(quien.nombre || quien.correo) && (
            <div>
              {quien.nombre && <p className="break-words text-lg font-extrabold leading-tight">{quien.nombre}</p>}
              {quien.correo && <p className="break-all text-sm text-ink-3">{quien.correo}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Insignia>{fechaHora(e.creado_en)}</Insignia>
            {e.rol && <Insignia tono="acento">{ROLES_RESPUESTA[e.rol] ?? e.rol}</Insignia>}
            {e.comision_id != null && <Insignia>{comision(e.comision_id)}</Insignia>}
            {e.referencia && <Insignia>{e.referencia}</Insignia>}
          </div>
          <dl className="flex flex-col gap-3">
            {campos.map((c) => {
              const v = e.respuestas[c.id]
              const lista = Array.isArray(v) ? v : null
              const vacio = v === undefined || v === null || v === '' || (lista && lista.length === 0)
              return (
                <div key={c.id} className="rounded-2xl border border-line bg-surface-2 p-3 dark:bg-white/[0.04]">
                  <dt className="font-cond text-xs font-bold uppercase tracking-wider text-acento">{TIPOS_CAMPO[c.tipo].nombre}</dt>
                  <dd className="mt-0.5 font-bold">{c.etiqueta}</dd>
                  <dd className="mt-1.5">
                    {vacio ? (
                      <span className="text-sm italic text-ink-3">Sin responder</span>
                    ) : lista ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {lista.map((x, k) => (
                          <li key={k} className="rounded-xl bg-surface px-3 py-1 text-sm font-semibold dark:bg-white/[0.08]">
                            {String(x)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="whitespace-pre-line">{textoRespuesta(v)}</p>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}
    </Modal>
  )
}
