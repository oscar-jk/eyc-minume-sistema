import { useState } from 'react'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { AreaTexto, Campo, Selector } from '@/components/Campo'
import { Modal } from '@/components/Modal'
import { Semaforo } from '@/components/Semaforo'
import { Aviso } from '@/components/Ui'
import { mensajeError } from '@/lib/errores'
import { ESTATUS } from '@/lib/formato'
import type { Estatus, Semaforo as TSemaforo } from '@/lib/tipos'
import { useDecidir, useRegistrarRecomendacion, useSustituir } from './api'

const OPCIONES_REC: Estatus[] = ['continua', 'seguimiento', 'sustitucion', 'no_evaluado']

export interface FilaRecomendable {
  persona_id: string | null
  nombre: string | null
  corte_id: number | null
  corte_nombre: string | null
  semaforo: TSemaforo | null
  puntaje: number | null
  n_evaluaciones: number | null
  recomendacion: Estatus | null
  recomendacion_comentario: string | null
  decision_id: string | null
}

/** Recomendación por persona y corte. Comentario obligatorio en amarillo, rojo y sustitución (lo valida también la base). */
export function RecomendacionModal({ fila, onCerrar }: { fila: FilaRecomendable | null; onCerrar: () => void }) {
  const avisar = useAvisar()
  const m = useRegistrarRecomendacion()
  const [rec, setRec] = useState<Estatus>(fila?.recomendacion ?? (fila?.semaforo === 'gris' ? 'no_evaluado' : 'continua'))
  const [comentario, setComentario] = useState(fila?.recomendacion_comentario ?? '')
  if (!fila) return null
  const exige = fila.semaforo === 'amarillo' || fila.semaforo === 'rojo' || rec === 'sustitucion'
  const falta = exige && !comentario.trim()
  const elevara = rec === 'sustitucion' || fila.semaforo === 'rojo'

  return (
    <Modal
      abierto
      titulo={`Recomendación · ${fila.corte_nombre}`}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={m.isPending}
            disabled={falta || !!fila.decision_id}
            onClick={() =>
              m.mutate(
                { personaId: fila.persona_id!, corteId: fila.corte_id!, recomendacion: rec, comentario },
                {
                  onSuccess: () => {
                    avisar('Recomendación registrada.')
                    onCerrar()
                  },
                },
              )
            }
          >
            Registrar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-semibold">{fila.nombre}</p>
          <div className="mt-1">
            <Semaforo semaforo={fila.semaforo} puntaje={fila.puntaje} n={fila.n_evaluaciones} />
          </div>
        </div>
        {fila.decision_id && <Aviso tono="info">Este corte ya tiene una decisión; la recomendación no se puede modificar.</Aviso>}
        <Selector etiqueta="Recomendación" value={rec} onChange={(e) => setRec(e.target.value as Estatus)} requerido>
          {OPCIONES_REC.map((o) => (
            <option key={o} value={o}>
              {ESTATUS[o]}
            </option>
          ))}
        </Selector>
        <AreaTexto
          etiqueta="Comentario"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          requerido={exige}
          ayuda={exige ? 'Obligatorio con semáforo amarillo o rojo y en toda recomendación de sustitución.' : undefined}
          error={falta ? 'Escribe el comentario.' : null}
        />
        {elevara && <Aviso tono="alerta">Este caso se elevará a la Secretaría General para su decisión.</Aviso>}
        {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
      </div>
    </Modal>
  )
}

export interface CasoDecidible {
  recomendacion_id: string | null
  persona_nombre: string | null
  corte_nombre: string | null
  recomendacion: Estatus | null
  recomendacion_comentario: string | null
  semaforo_registrado: TSemaforo | null
  puntaje_registrado: number | null
  n_evaluaciones: number | null
  elevada: boolean | null
}

/** Decisión sobre una recomendación. Si es sustitución puede registrarse la persona entrante en la misma transacción. */
export function DecisionModal({ caso, onCerrar }: { caso: CasoDecidible | null; onCerrar: () => void }) {
  const avisar = useAvisar()
  const m = useDecidir()
  const [decision, setDecision] = useState<Estatus>(caso?.recomendacion ?? 'continua')
  const [comentario, setComentario] = useState('')
  const [sustituirAhora, setSustituirAhora] = useState(false)
  const [entrante, setEntrante] = useState({ nombre: '', correo: '' })
  if (!caso) return null
  const exige = !!caso.elevada || decision === 'seguimiento' || decision === 'sustitucion'
  const falta = (exige && !comentario.trim()) || (sustituirAhora && entrante.nombre.trim().length < 2)

  return (
    <Modal
      abierto
      titulo={`Decisión · ${caso.persona_nombre}`}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante={decision === 'sustitucion' ? 'peligro' : 'primario'}
            cargando={m.isPending}
            disabled={falta}
            onClick={() =>
              m.mutate(
                {
                  recomendacionId: caso.recomendacion_id!,
                  decision,
                  comentario,
                  sustitucion: decision === 'sustitucion' && sustituirAhora ? { nombre: entrante.nombre.trim(), correo: entrante.correo.trim() || undefined } : undefined,
                },
                {
                  onSuccess: () => {
                    avisar('Decisión registrada.')
                    onCerrar()
                  },
                },
              )
            }
          >
            Confirmar decisión
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-surface-2 p-3 text-sm">
          <p className="font-semibold">{caso.corte_nombre}</p>
          <div className="my-2">
            <Semaforo semaforo={caso.semaforo_registrado} puntaje={caso.puntaje_registrado} n={caso.n_evaluaciones} />
          </div>
          <p>
            Recomendación: <strong>{caso.recomendacion && ESTATUS[caso.recomendacion]}</strong>
          </p>
          {caso.recomendacion_comentario && <p className="mt-1 text-ink-2">«{caso.recomendacion_comentario}»</p>}
        </div>
        <Selector etiqueta="Decisión" value={decision} onChange={(e) => setDecision(e.target.value as Estatus)} requerido>
          {(['continua', 'seguimiento', 'sustitucion'] as Estatus[]).map((o) => (
            <option key={o} value={o}>
              {ESTATUS[o]}
            </option>
          ))}
        </Selector>
        <AreaTexto
          etiqueta="Comentario de la decisión"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          requerido={exige}
          error={exige && !comentario.trim() ? 'Obligatorio en casos elevados y en seguimiento o sustitución.' : null}
        />
        {decision === 'sustitucion' && (
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-accent hover:shadow-card dark:bg-white/[0.04]">
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={sustituirAhora} onChange={(e) => setSustituirAhora(e.target.checked)} />
              <span className="text-sm font-semibold">Registrar ya a la persona que entra (se asigna al mismo cargo)</span>
            </label>
            {sustituirAhora && (
              <>
                <Campo etiqueta="Nombre completo de quien entra" value={entrante.nombre} onChange={(e) => setEntrante({ ...entrante, nombre: e.target.value })} requerido />
                <Campo etiqueta="Correo (opcional)" type="email" value={entrante.correo} onChange={(e) => setEntrante({ ...entrante, correo: e.target.value })} />
              </>
            )}
            {!sustituirAhora && <p className="text-sm text-ink-3">Podrás registrar la sustitución después desde la ficha de la persona.</p>}
          </div>
        )}
        {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
      </div>
    </Modal>
  )
}

/** Sustitución posterior a una decisión de sustitución (la base exige esa decisión). */
export function SustitucionModal({ abierto, salienteId, nombre, onCerrar }: { abierto: boolean; salienteId: string; nombre: string; onCerrar: () => void }) {
  return abierto ? <SustitucionForm salienteId={salienteId} nombre={nombre} onCerrar={onCerrar} /> : null
}

function SustitucionForm({ salienteId, nombre, onCerrar }: { salienteId: string; nombre: string; onCerrar: () => void }) {
  const avisar = useAvisar()
  const m = useSustituir()
  const [entrante, setEntrante] = useState({ nombre: '', correo: '', nota: '' })
  return (
    <Modal
      abierto
      titulo={`Sustituir a ${nombre}`}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            cargando={m.isPending}
            disabled={entrante.nombre.trim().length < 2}
            onClick={() =>
              m.mutate(
                { salienteId, entrante: { nombre: entrante.nombre.trim(), correo: entrante.correo.trim() || undefined }, nota: entrante.nota.trim() || undefined },
                {
                  onSuccess: () => {
                    avisar('Sustitución registrada.')
                    onCerrar()
                  },
                },
              )
            }
          >
            Sustituir
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Aviso tono="info">La persona saliente queda inactiva con todo su historial. Quien entra ocupa el mismo cargo y comisión desde ahora.</Aviso>
        <Campo etiqueta="Nombre completo de quien entra" value={entrante.nombre} onChange={(e) => setEntrante({ ...entrante, nombre: e.target.value })} requerido />
        <Campo etiqueta="Correo (opcional)" type="email" value={entrante.correo} onChange={(e) => setEntrante({ ...entrante, correo: e.target.value })} />
        <AreaTexto etiqueta="Nota (opcional)" value={entrante.nota} onChange={(e) => setEntrante({ ...entrante, nota: e.target.value })} />
        {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
      </div>
    </Modal>
  )
}
