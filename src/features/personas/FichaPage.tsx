import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Boton } from '@/components/Boton'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Aviso, Insignia, Tabla, Tarjeta, Titulo } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { useHistorialPersona } from '@/features/asignaciones/api'
import { siglaDe } from '@/features/comisiones/api'
import { useCasos, useContinuidad } from '@/features/continuidad/api'
import { SustitucionModal } from '@/features/continuidad/Modales'
import { TablaCortes } from '@/features/cortes/TablaCortes'
import { useEvaluaciones } from '@/features/evaluacion/api'
import { AMBITO, ESTATUS, MOTIVO, fecha, fechaHora, puntaje } from '@/lib/formato'
import { usePersona } from './api'
import { EditarPersona } from './EditarPersona'

export function FichaPage() {
  const { id } = useParams()
  const { perfil } = useSesion()
  const persona = usePersona(id)
  const asignaciones = useHistorialPersona(id)
  const casos = useCasos({ personaId: id })
  const cont = useContinuidad(id)
  const evals = useEvaluaciones({ personaId: id })
  const [corteDetalle, setCorteDetalle] = useState<number | null>(null)
  const [sustituir, setSustituir] = useState(false)
  const [editar, setEditar] = useState(false)
  const gestiona = perfil?.rol === 'subsecretario' || perfil?.rol === 'admin'

  const puedeSustituir =
    persona.data?.activa && cont.data?.estatus === 'sustitucion' && ['subsecretario', 'secretario', 'admin'].includes(perfil?.rol ?? '')
  const vigente = asignaciones.data?.find((a) => !a.hasta)

  return (
    <Consulta q={persona} esVacio={(p) => !p} vacio={
        <Aviso tono="peligro" titulo="No encontramos a esta persona" accion={{ texto: 'Volver a mi inicio', a: '/' }}>
          Puede que no tengas acceso a su ficha o que el enlace esté incompleto.
        </Aviso>
      }>
      {(p) => (
        <div className="flex flex-col gap-5">
          <Titulo
            sobre="Ficha de persona"
            adorno="flor"
            sub={
              <span className="flex flex-wrap items-center gap-2">
                <Insignia>{AMBITO[p!.ambito]}</Insignia>
                {vigente ? (
                  <Insignia tono="acento">
                    {siglaDe(vigente.comision)} · {vigente.cargo?.nombre}
                  </Insignia>
                ) : (
                  <Insignia>Sin asignación vigente</Insignia>
                )}
                {!p!.activa && <Insignia tono="peligro">Inactiva (sustituida)</Insignia>}
              </span>
            }
            accion={
              <div className="flex flex-wrap gap-2">
                {gestiona && (
                  <Boton variante="claro" onClick={() => setEditar(true)}>
                    Editar datos
                  </Boton>
                )}
                {puedeSustituir && (
                  <Boton variante="peligro" onClick={() => setSustituir(true)}>
                    Registrar sustitución
                  </Boton>
                )}
              </div>
            }
          >
            {p!.nombre}
          </Titulo>

          <Tarjeta titulo="Resultados">
            <TablaCortes personaId={p!.id} onDetalle={setCorteDetalle} />
          </Tarjeta>

          <Tarjeta
            titulo={corteDetalle ? 'Evaluaciones del corte' : 'Evaluaciones'}
            accion={
              corteDetalle && (
                <Boton variante="fantasma" onClick={() => setCorteDetalle(null)}>
                  Ver todas
                </Boton>
              )
            }
          >
            <Consulta q={evals} vacio={<EstadoVacio titulo="Sin evaluaciones registradas" />}>
              {(filas) => (
                <Tabla etiqueta="Evaluaciones de la persona">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Actividad / jornada</th>
                      <th>Corte</th>
                      <th>Comisión</th>
                      <th>Evaluador</th>
                      <th>Estado</th>
                      <th className="text-right">Puntaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas
                      .filter((e) => !corteDetalle || e.corte_id === corteDetalle)
                      .map((e) => (
                        <tr key={e.evaluacion_id}>
                          <td className="tabular">{fecha(e.fecha)}</td>
                          <td>
                            <Link to={`/evaluaciones/${e.evaluacion_id}`} className="font-bold text-acento hover:underline">
                              {e.actividad_nombre ?? 'Jornada'}
                            </Link>
                            {e.observacion_rotacion && <span className="block text-xs text-ink-3">{e.observacion_rotacion}</span>}
                          </td>
                          <td>{e.corte_nombre}</td>
                          <td>{e.comision_sigla ?? '—'}</td>
                          <td>{e.evaluador_nombre ?? '—'}</td>
                          <td>{e.estado === 'completa' ? <Insignia tono="exito">Completa</Insignia> : <Insignia tono="alerta">Borrador</Insignia>}</td>
                          <td className="tabular text-right font-semibold">{e.estado === 'completa' ? puntaje(e.puntaje) : '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </Tabla>
              )}
            </Consulta>
          </Tarjeta>

          <div className="grid gap-5 lg:grid-cols-2">
            <Tarjeta titulo="Historial de asignaciones">
              <Consulta q={asignaciones} vacio={<EstadoVacio titulo="Sin asignaciones" />}>
                {(filas) => (
                  <ol className="flex flex-col gap-2">
                    {filas.map((a) => (
                      <li key={a.id} className="rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-accent hover:shadow-card dark:bg-white/[0.04]">
                        <p className="font-semibold">
                          {siglaDe(a.comision)} · {a.cargo?.nombre}
                        </p>
                        <p className="font-cond text-sm text-ink-3">
                          {fechaHora(a.desde)} → {a.hasta ? fechaHora(a.hasta) : 'vigente'} · {MOTIVO[a.motivo]}
                        </p>
                        {a.nota && <p className="mt-1 text-sm text-ink-2">{a.nota}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </Consulta>
            </Tarjeta>

            <Tarjeta titulo="Historial de recomendaciones y decisiones">
              <Consulta q={casos} vacio={<EstadoVacio titulo="Sin recomendaciones" />}>
                {(filas) => (
                  <ol className="flex flex-col gap-2">
                    {filas.map((c) => (
                      <li key={c.recomendacion_id} className="rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-accent hover:shadow-card dark:bg-white/[0.04] text-sm">
                        <p className="font-semibold">{c.corte_nombre}</p>
                        <p>
                          Recomendación: <strong>{c.recomendacion && ESTATUS[c.recomendacion]}</strong> · {c.recomendacion_autor_nombre} · {fechaHora(c.recomendacion_fecha)}
                        </p>
                        {c.recomendacion_comentario && <p className="text-ink-2">«{c.recomendacion_comentario}»</p>}
                        {c.decision ? (
                          <p className="mt-1">
                            Decisión: <strong>{ESTATUS[c.decision]}</strong> · {c.decision_autor_nombre} · {fechaHora(c.decision_fecha)}
                            {c.decision_comentario && <span className="block text-ink-2">«{c.decision_comentario}»</span>}
                          </p>
                        ) : (
                          <p className="mt-1 font-semibold text-amarillo">Pendiente de decisión{c.elevada ? ' (Secretaría General)' : ''}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </Consulta>
            </Tarjeta>
          </div>
          {editar && <EditarPersona persona={p!} onCerrar={() => setEditar(false)} />}
          <SustitucionModal abierto={sustituir} salienteId={p!.id} nombre={p!.nombre} onCerrar={() => setSustituir(false)} />
        </div>
      )}
    </Consulta>
  )
}
