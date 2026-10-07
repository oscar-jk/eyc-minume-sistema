import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMomento } from '@/app/fase'
import { Boton } from '@/components/Boton'
import { Selector } from '@/components/Campo'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Semaforo } from '@/components/Semaforo'
import { Aviso, Insignia, Pestanas, Tabla, Tarjeta, Titulo } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { ActividadesPanel } from '@/features/actividades/ActividadesPanel'
import { useActividades } from '@/features/actividades/api'
import { useAsignadosEn, useHistorialComision, useVigentes } from '@/features/asignaciones/api'
import { RecomendacionModal, type FilaRecomendable } from '@/features/continuidad/Modales'
import { useEvaluaciones } from '@/features/evaluacion/api'
import { useMonitoreo } from '@/features/monitoreo/api'
import { ESTATUS, MOTIVO, fecha, fechaHora, puntaje } from '@/lib/formato'
import { siglaDe, useComisiones } from './api'

type Tab = 'evaluar' | 'mesa' | 'actividades' | 'historico'

/** /comision (EyC: la suya) o /comisiones/:id (Subsecretaría y Secretaría: cualquiera). */
export function ComisionPage() {
  const { id } = useParams()
  const { perfil } = useSesion()
  const comisiones = useComisiones()
  const comisionId = id ? Number(id) : (perfil?.comision_id ?? undefined)
  const comision = comisiones.data?.find((c) => c.id === comisionId)
  const [tab, setTab] = useState<Tab>('evaluar')

  if (!comisionId) return <Aviso tono="alerta">Tu cuenta no tiene una comisión asignada.</Aviso>

  return (
    <>
      <Titulo sub={comision?.nombre}>
        {comision ? siglaDe(comision) : 'Comisión'}
      </Titulo>
      <Pestanas
        etiqueta="Secciones de la comisión"
        valor={tab}
        onCambio={setTab}
        opciones={[
          { valor: 'evaluar', etiqueta: 'Evaluar' },
          { valor: 'mesa', etiqueta: 'Mesa directiva' },
          { valor: 'actividades', etiqueta: 'Actividades' },
          { valor: 'historico', etiqueta: 'Histórico' },
        ]}
      />
      {tab === 'evaluar' && <EvaluarPanel comisionId={comisionId} />}
      {tab === 'mesa' && <MesaPanel comisionId={comisionId} />}
      {tab === 'actividades' && <ActividadesPanel comisionId={comisionId} />}
      {tab === 'historico' && <HistoricoPanel comisionId={comisionId} />}
    </>
  )
}

function EstadoEval({ estado }: { estado: string | null | undefined }) {
  if (estado === 'completa') return <Insignia tono="exito">Completa</Insignia>
  if (estado === 'borrador') return <Insignia tono="alerta">Borrador</Insignia>
  return <Insignia>Sin evaluar</Insignia>
}

/** Evento: quién está hoy (o en la jornada elegida). Antes del evento: por actividad. */
function EvaluarPanel({ comisionId }: { comisionId: number }) {
  const m = useMomento()
  const faseEvento = m.abiertas.find((f) => f.es_evento && f.tipo === 'evaluacion')
  if (faseEvento) return <JornadaPanel comisionId={comisionId} fase={faseEvento} hoy={m.hoy} />
  const fasePrevia = m.abiertas.find((f) => !f.es_evento && f.tipo === 'evaluacion')
  if (fasePrevia) return <PorActividad comisionId={comisionId} />
  return (
    <Aviso tono="alerta" titulo="No hay una fase de evaluación abierta">
      Cuando la Subsecretaría abra una fase podrás evaluar desde aquí. Mientras tanto puedes consultar el histórico.
    </Aviso>
  )
}

function JornadaPanel({ comisionId, fase, hoy }: { comisionId: number; fase: { inicio: string | null; fin: string | null; nombre: string }; hoy: string | null }) {
  const dias = useMemo(() => {
    const out: string[] = []
    if (!fase.inicio || !fase.fin) return out
    for (let d = new Date(`${fase.inicio}T00:00:00Z`); d <= new Date(`${fase.fin}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10)
      if (!hoy || iso <= hoy) out.push(iso)
    }
    return out
  }, [fase, hoy])
  const [dia, setDia] = useState(() => (hoy && dias.includes(hoy) ? hoy : dias[dias.length - 1]))
  const q = useAsignadosEn(comisionId, dia)

  if (!dias.length) return <Aviso tono="info">Las jornadas de {fase.nombre} aún no empiezan.</Aviso>

  return (
    <Tarjeta
      titulo={dia === hoy ? 'Hoy en tu comisión' : `Jornada del ${fecha(dia, true)}`}
      accion={
        dias.length > 1 && (
          <Selector etiqueta="Jornada" value={dia} onChange={(e) => setDia(e.target.value)} className="min-w-44">
            {dias.map((d) => (
              <option key={d} value={d}>
                {fecha(d, true)}
                {d === hoy ? ' (hoy)' : ''}
              </option>
            ))}
          </Selector>
        )
      }
    >
      <Consulta q={q} vacio={<EstadoVacio titulo="Nadie asignado a esta comisión ese día">Si hubo una rotación, la Subsecretaría debe registrarla.</EstadoVacio>}>
        {(filas) => (
          <ul className="flex flex-col gap-2">
            {filas
              .filter((f) => f.ambito === 'mesa')
              .map((f) => (
                <li key={f.asignacion_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/personas/${f.persona_id}`} className="font-semibold hover:underline">
                      {f.persona_nombre}
                    </Link>
                    <p className="font-cond text-sm text-ink-3">
                      {f.cargo_nombre}
                      {!f.dominante && ' · rotó: su jornada se evalúa en la otra comisión'}
                    </p>
                  </div>
                  <EstadoEval estado={f.evaluacion_estado} />
                  {f.dominante && (
                    <Link
                      to={f.evaluacion_id ? `/evaluaciones/${f.evaluacion_id}` : `/evaluar?persona=${f.persona_id}&fecha=${dia}`}
                      className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
                    >
                      {f.evaluacion_estado === 'completa' ? 'Ver' : f.evaluacion_estado ? 'Continuar' : 'Evaluar'}
                    </Link>
                  )}
                </li>
              ))}
          </ul>
        )}
      </Consulta>
    </Tarjeta>
  )
}

function PorActividad({ comisionId }: { comisionId: number }) {
  const m = useMomento()
  const vigentes = useVigentes(comisionId)
  const [actividad, setActividad] = useState<string>('')
  const evals = useEvaluaciones({ actividadId: actividad }, !!actividad)
  const actividades = useActividadesAbiertas(comisionId)

  return (
    <Tarjeta titulo="Evaluar por actividad">
      <Consulta
        q={actividades}
        vacio={<EstadoVacio titulo="No hay actividades abiertas">Crea la actividad en la pestaña «Actividades» y luego evalúa aquí.</EstadoVacio>}
      >
        {(acts) => (
          <div className="flex flex-col gap-4">
            <Selector etiqueta="Actividad" value={actividad} onChange={(e) => setActividad(e.target.value)}>
              <option value="">Elige una actividad…</option>
              {acts.map((a) => (
                <option key={a.id} value={a.id}>
                  {fecha(a.fecha)} · {a.nombre}
                </option>
              ))}
            </Selector>
            {actividad && (
              <Consulta q={vigentes} vacio={<EstadoVacio titulo="La mesa directiva aún no está cargada">La Subsecretaría registra a las personas y sus cargos.</EstadoVacio>}>
                {(personas) => (
                  <ul className="flex flex-col gap-2">
                    {personas
                      .filter((p) => p.ambito === 'mesa')
                      .map((p) => {
                        const ev = evals.data?.find((e) => e.persona_id === p.persona_id)
                        return (
                          <li key={p.asignacion_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold">{p.persona_nombre}</p>
                              <p className="font-cond text-sm text-ink-3">{p.cargo_nombre}</p>
                            </div>
                            <EstadoEval estado={ev?.estado} />
                            <Link
                              to={ev ? `/evaluaciones/${ev.evaluacion_id}` : `/evaluar?persona=${p.persona_id}&actividad=${actividad}`}
                              className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
                            >
                              {ev?.estado === 'completa' ? 'Ver' : ev ? 'Continuar' : 'Evaluar'}
                            </Link>
                          </li>
                        )
                      })}
                  </ul>
                )}
              </Consulta>
            )}
          </div>
        )}
      </Consulta>
      {m.faseEvaluacionAbierta && <p className="mt-3 text-sm text-ink-3">Fase: {m.faseEvaluacionAbierta.nombre}</p>}
    </Tarjeta>
  )
}

function useActividadesAbiertas(comisionId: number) {
  const q = useActividades({ comisionId, ambito: 'mesa' })
  return {
    ...q,
    data: q.data?.filter((a) => !a.cerrada && a.fase?.estado === 'abierta'),
  } as typeof q
}

/** Quién está asignado ahora, su semáforo del corte activo, y el historial de la comisión. */
function MesaPanel({ comisionId }: { comisionId: number }) {
  const m = useMomento()
  const { perfil } = useSesion()
  const recomienda = perfil?.rol === 'eyc' || perfil?.rol === 'subsecretario' || perfil?.rol === 'admin'
  const vigentes = useVigentes(comisionId)
  const monitoreo = useMonitoreo(m.corteActivo?.id)
  const historial = useHistorialComision(comisionId)
  const [rec, setRec] = useState<FilaRecomendable | null>(null)
  const corteAbierto = m.abiertas.some((f) => f.corte_id === m.corteActivo?.id)

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta titulo="Asignados ahora" accion={m.corteActivo && <span className="font-cond text-sm text-ink-3">Semáforo de {m.corteActivo.nombre}</span>}>
        <Consulta q={vigentes} vacio={<EstadoVacio titulo="Sin mesa directiva asignada" />}>
          {(personas) => (
            <ul className="flex flex-col gap-2">
              {personas
                .filter((p) => p.ambito === 'mesa')
                .map((p) => {
                  const fila = monitoreo.data?.find((x) => x.persona_id === p.persona_id)
                  return (
                    <li key={p.asignacion_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                      <div className="min-w-0 flex-1">
                        <Link to={`/personas/${p.persona_id}`} className="font-semibold hover:underline">
                          {p.persona_nombre}
                        </Link>
                        <p className="font-cond text-sm text-ink-3">
                          {p.cargo_nombre} · desde {fechaHora(p.desde)}
                        </p>
                      </div>
                      {fila && <Semaforo semaforo={fila.semaforo} puntaje={fila.puntaje} n={fila.n_evaluaciones} compacto />}
                      {fila?.recomendacion && <Insignia tono="acento">Rec.: {ESTATUS[fila.recomendacion]}</Insignia>}
                      {recomienda && corteAbierto && fila && !fila.decision_id && (
                        <Boton variante="secundario" onClick={() => setRec(fila)}>
                          {fila.recomendacion ? 'Editar recomendación' : 'Recomendar'}
                        </Boton>
                      )}
                    </li>
                  )
                })}
            </ul>
          )}
        </Consulta>
      </Tarjeta>

      <Tarjeta titulo="Historial de asignaciones">
        <Consulta q={historial} vacio={<EstadoVacio titulo="Sin movimientos registrados" />}>
          {(filas) => (
            <Tabla etiqueta="Historial de asignaciones de la comisión">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Cargo</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link to={`/personas/${a.persona_id}`} className="font-semibold hover:underline">
                        {a.persona?.nombre}
                      </Link>
                    </td>
                    <td>{a.cargo?.nombre}</td>
                    <td className="tabular">{fechaHora(a.desde)}</td>
                    <td className="tabular">{a.hasta ? fechaHora(a.hasta) : <Insignia tono="exito">Vigente</Insignia>}</td>
                    <td>{MOTIVO[a.motivo]}</td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Consulta>
      </Tarjeta>
      {rec && <RecomendacionModal key={`${rec.persona_id}-${rec.corte_id}`} fila={rec} onCerrar={() => setRec(null)} />}
    </div>
  )
}

/** Evaluaciones de cualquier persona que haya pasado por la comisión (aunque hoy esté en otra). */
function HistoricoPanel({ comisionId }: { comisionId: number }) {
  const historial = useHistorialComision(comisionId)
  const ids = [...new Set((historial.data ?? []).map((a) => a.persona_id))]
  const evals = useEvaluaciones({ personas: ids, ambito: 'mesa' }, ids.length > 0)
  const [persona, setPersona] = useState('')
  const personas = [...new Map((historial.data ?? []).map((a) => [a.persona_id, a.persona?.nombre ?? ''])).entries()].sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <Tarjeta
      titulo="Histórico de evaluaciones"
      accion={
        <Selector etiqueta="Persona" value={persona} onChange={(e) => setPersona(e.target.value)} className="min-w-52">
          <option value="">Todas</option>
          {personas.map(([id, n]) => (
            <option key={id} value={id}>
              {n}
            </option>
          ))}
        </Selector>
      }
    >
      {ids.length === 0 && !historial.isPending ? (
        <EstadoVacio titulo="Aún no hay personas en esta comisión" />
      ) : (
        <Consulta q={evals} vacio={<EstadoVacio titulo="Sin evaluaciones registradas" />}>
          {(filas) => (
            <Tabla etiqueta="Evaluaciones">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Persona</th>
                  <th>Actividad / jornada</th>
                  <th>Comisión</th>
                  <th>Estado</th>
                  <th className="text-right">Puntaje</th>
                </tr>
              </thead>
              <tbody>
                {filas
                  .filter((e) => !persona || e.persona_id === persona)
                  .map((e) => (
                    <tr key={e.evaluacion_id}>
                      <td className="tabular">{fecha(e.fecha)}</td>
                      <td>
                        <Link to={`/evaluaciones/${e.evaluacion_id}`} className="font-semibold text-accent hover:underline">
                          {e.persona_nombre}
                        </Link>
                      </td>
                      <td>{e.actividad_nombre ?? 'Jornada'}</td>
                      <td>{e.comision_sigla ?? '—'}</td>
                      <td>
                        <EstadoEval estado={e.estado} />
                      </td>
                      <td className="tabular text-right font-semibold">{e.estado === 'completa' ? puntaje(e.puntaje) : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </Tabla>
          )}
        </Consulta>
      )}
    </Tarjeta>
  )
}
