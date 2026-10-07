import { useState } from 'react'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { AreaTexto, Campo, Selector } from '@/components/Campo'
import { Consulta } from '@/components/Estados'
import { Modal } from '@/components/Modal'
import { Aviso, Insignia, Tarjeta } from '@/components/Ui'
import { mensajeError } from '@/lib/errores'
import { AMBITO, fechaHora } from '@/lib/formato'
import type { Ambito, Criterio, Respuesta } from '@/lib/tipos'
import { useCriterios, useDimensiones, useGuardarCriterio, useHistorialCriterio } from './api'

export function CriteriosPanel() {
  const [ambito, setAmbito] = useState<Ambito>('mesa')
  const dims = useDimensiones()
  const q = useCriterios(ambito)
  const [editar, setEditar] = useState<Partial<Criterio> | null>(null)
  const [historial, setHistorial] = useState<Criterio | null>(null)

  return (
    <Tarjeta
      titulo="Criterios de la rúbrica"
      accion={
        <Selector etiqueta="Ámbito" value={ambito} onChange={(e) => setAmbito(e.target.value as Ambito)} className="min-w-48">
          <option value="mesa">{AMBITO.mesa}</option>
          <option value="eyc">{AMBITO.eyc}</option>
        </Selector>
      }
    >
      <p className="mb-4 text-sm text-ink-2">
        Cada criterio define su respuesta favorable: algunos están redactados en negativo. Editar un criterio no altera evaluaciones ya hechas (guardan el texto con el que se
        respondieron).
      </p>
      <Consulta q={q}>
        {(cs) => (
          <div className="flex flex-col gap-4">
            {dims.data?.map((d) => (
              <section key={d.id}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    <span className="font-cond font-bold text-accent">{d.clave}</span> {d.nombre}
                  </h3>
                  <Boton
                    variante="fantasma"
                    onClick={() => setEditar({ ambito, dimension_id: d.id, favorable: 'si', codigo: `${d.clave}${cs.filter((c) => c.dimension_id === d.id).length + 1}`, texto: '' })}
                  >
                    + Criterio
                  </Boton>
                </div>
                <ul className="flex flex-col gap-2">
                  {cs
                    .filter((c) => c.dimension_id === d.id)
                    .map((c) => (
                      <li key={c.id} className={`flex flex-wrap items-center gap-2 rounded-xl border border-line p-3 ${c.activo ? '' : 'opacity-60'}`}>
                        <span className="font-cond font-bold text-accent">{c.codigo}</span>
                        <span className="min-w-0 flex-1 basis-60">{c.texto}</span>
                        <Insignia tono={c.favorable === 'no' ? 'alerta' : 'neutro'}>Favorable: {c.favorable === 'si' ? 'Sí' : 'No'}</Insignia>
                        {!c.activo && <Insignia>Inactivo</Insignia>}
                        {c.version > 1 && (
                          <Boton variante="fantasma" onClick={() => setHistorial(c)}>
                            v{c.version} · historial
                          </Boton>
                        )}
                        <Boton variante="secundario" onClick={() => setEditar(c)}>
                          Editar
                        </Boton>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Consulta>
      {editar && <EditarCriterio key={editar.id ?? 'nuevo'} criterio={editar} onCerrar={() => setEditar(null)} />}
      {historial && <HistorialModal criterio={historial} onCerrar={() => setHistorial(null)} />}
    </Tarjeta>
  )
}

function EditarCriterio({ criterio, onCerrar }: { criterio: Partial<Criterio>; onCerrar: () => void }) {
  const avisar = useAvisar()
  const m = useGuardarCriterio()
  const [c, setC] = useState(criterio)
  return (
    <Modal
      abierto
      titulo={c.id ? `Editar ${c.codigo}` : 'Nuevo criterio'}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={m.isPending}
            disabled={!c.texto?.trim() || !c.codigo?.trim()}
            onClick={() =>
              m.mutate(
                { ...c, texto: c.texto!.trim() },
                {
                  onSuccess: () => {
                    avisar('Criterio guardado.')
                    onCerrar()
                  },
                },
              )
            }
          >
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!c.id && <Campo etiqueta="Código" value={c.codigo ?? ''} onChange={(e) => setC({ ...c, codigo: e.target.value })} requerido />}
        <AreaTexto etiqueta="Texto del criterio" value={c.texto ?? ''} onChange={(e) => setC({ ...c, texto: e.target.value })} requerido />
        <Selector
          etiqueta="Respuesta favorable"
          value={c.favorable}
          onChange={(e) => setC({ ...c, favorable: e.target.value as Respuesta })}
          ayuda="Si el criterio está redactado en negativo (p. ej. «mostró desconocimiento…»), lo favorable es «No»."
        >
          <option value="si">Sí</option>
          <option value="no">No</option>
        </Selector>
        {c.id && (
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={!!c.activo} onChange={(e) => setC({ ...c, activo: e.target.checked })} />
            Activo (los inactivos no se piden en evaluaciones nuevas)
          </label>
        )}
        {c.id && <Aviso tono="info">Se guarda una nueva versión; la anterior queda en el historial.</Aviso>}
        {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
      </div>
    </Modal>
  )
}

function HistorialModal({ criterio, onCerrar }: { criterio: Criterio; onCerrar: () => void }) {
  const q = useHistorialCriterio(criterio.id)
  return (
    <Modal abierto titulo={`Historial de ${criterio.codigo}`} onCerrar={onCerrar} acciones={<Boton onClick={onCerrar}>Cerrar</Boton>}>
      <Consulta q={q}>
        {(vs) => (
          <ol className="flex flex-col gap-2">
            <li className="rounded-xl border border-accent p-3 text-sm">
              <p className="font-semibold">v{criterio.version} (actual)</p>
              <p>{criterio.texto}</p>
            </li>
            {vs.map((v) => (
              <li key={v.id} className="rounded-xl border border-line p-3 text-sm">
                <p className="font-semibold">
                  v{v.version} · hasta {fechaHora(v.vigente_hasta)}
                </p>
                <p>{v.texto}</p>
                <p className="text-ink-3">
                  Favorable: {v.favorable === 'si' ? 'Sí' : 'No'}
                  {!v.activo && ' · inactivo'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Consulta>
    </Modal>
  )
}
