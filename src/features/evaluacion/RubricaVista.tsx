import { Boton } from '@/components/Boton'
import { Consulta } from '@/components/Estados'
import { Modal } from '@/components/Modal'
import { Insignia } from '@/components/Ui'
import { useCriterios, useDimensiones, usePesos } from '@/features/configuracion/api'
import { AMBITO } from '@/lib/formato'
import type { Ambito } from '@/lib/tipos'
import { agruparPorSeccion } from './reglas'

/** Rúbrica vigente de un ámbito, en solo lectura: secciones, dimensiones, su peso y los criterios con los que se evalúa. */
export function RubricaVista({ ambito, abierto, onCerrar, titulo }: { ambito: Ambito; abierto: boolean; onCerrar: () => void; titulo?: string }) {
  const dims = useDimensiones()
  const criterios = useCriterios(ambito)
  const pesos = usePesos()

  return (
    <Modal abierto={abierto} titulo={titulo ?? `Rúbrica · ${AMBITO[ambito]}`} onCerrar={onCerrar} acciones={<Boton onClick={onCerrar}>Entendido</Boton>}>
      <p className="mb-3 text-sm text-ink-2">
        {ambito === 'mesa' ? (
          <>
            Con esta rúbrica se evalúa a cada persona en esta actividad. Cada criterio recibe una <strong>nota de 0 hasta sus puntos</strong> y siempre una <strong>descripción</strong>, incluso
            si no se observó (N/A: ese criterio sale del cálculo y el resto se reescala a 100).
          </>
        ) : (
          <>
            Con esta rúbrica se evalúa a cada persona en esta actividad. Cada criterio se responde <strong>Sí</strong>, <strong>No</strong> o <strong>N/O</strong> (no observado, que no cuenta en el
            cálculo). El peso indica cuánto vale cada dimensión en el puntaje.
          </>
        )}
      </p>
      <Consulta q={criterios}>
        {(cs) => {
          const filas = (dims.data ?? [])
            .map((d) => ({
              d,
              seccion: d.seccion,
              items: cs.filter((c) => c.dimension_id === d.id && c.activo),
              peso: pesos.data?.find((p) => p.ambito === ambito && p.dimension_id === d.id)?.peso,
            }))
            .filter((x) => x.items.length > 0)
          return (
            <div className="flex flex-col gap-4">
              {agruparPorSeccion(filas).map((g) => (
                <div key={g.seccion ?? 'general'} className="flex flex-col gap-3">
                  {g.seccion && <h3 className="sobretitulo border-b border-line pb-1 text-acento">{g.seccion}</h3>}
                  {g.items.map(({ d, items, peso }) => (
                    <section key={d.id}>
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-semibold">
                          <span className="font-cond font-bold text-acento">{d.clave}</span> {d.nombre}
                        </h4>
                        {peso != null && (
                          <Insignia tono="acento">
                            {Number(peso).toLocaleString('es-DO')} {items.some((c) => c.tipo === 'nota') ? 'pts' : '%'}
                          </Insignia>
                        )}
                      </div>
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {items.map((c) => (
                          <li key={c.id} className="flex gap-2 rounded-xl border border-line bg-surface px-3 py-2 dark:bg-white/[0.04]">
                            {c.tipo !== 'nota' && <span className="font-cond font-bold text-acento">{c.codigo}</span>}
                            <span className="min-w-0 flex-1">
                              {c.texto}
                              {c.favorable === 'no' && c.tipo !== 'nota' && <span className="block font-cond text-xs text-ink-3">Lo esperado es «No»</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              ))}
            </div>
          )
        }}
      </Consulta>
    </Modal>
  )
}
