import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMomento } from '@/app/fase'
import { Boton } from '@/components/Boton'
import { Campo, Selector } from '@/components/Campo'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Semaforo } from '@/components/Semaforo'
import { Acento, Aviso, Dato, Insignia, Pestanas, Tabla, Tarjeta, Titulo } from '@/components/Ui'
import { ActividadesPanel } from '@/features/actividades/ActividadesPanel'
import { useEvaluaciones } from '@/features/evaluacion/api'
import { useMonitoreo } from '@/features/monitoreo/api'
import { usePersona } from '@/features/personas/api'
import { fecha, puntaje } from '@/lib/formato'

type Tab = 'directorio' | 'historial' | 'actividades'
type Eval = NonNullable<ReturnType<typeof useEvaluaciones>['data']>[number]

/** Evaluación directa: sin actividad ni jornada (la base la liga a la fase de evaluación abierta). */
const esDirecta = (e: Pick<Eval, 'actividad_id' | 'fecha_jornada'>) => !e.actividad_id && !e.fecha_jornada
const tipoEval = (e: Eval) => (esDirecta(e) ? 'Directa' : e.actividad_nombre ?? 'Jornada del evento')

/**
 * Módulo propio de la Subsecretaría: evalúa a los integrantes del equipo de Evaluación y Control.
 * La rúbrica y los pesos son los de «Criterios» y «Pesos» en Configuración; aquí solo se aplican y se consultan.
 */
export function EvaluadoresPage() {
  const [sp, setSp] = useSearchParams()
  const [tab, setTab] = useState<Tab>('directorio')
  const seleccionada = sp.get('persona')
  const elegir = (id: string | null) => setSp(id ? { persona: id } : {}, { replace: true })

  return (
    <>
      <Titulo sobre="Evaluación" adorno="circulos" sub="Consulta al equipo de Evaluación y Control, aplica la rúbrica y revisa evaluaciones anteriores">
        Evaluación <Acento>de</Acento> evaluadores
      </Titulo>
      <Pestanas
        etiqueta="Vistas de evaluación de evaluadores"
        valor={tab}
        onCambio={setTab}
        opciones={[
          { valor: 'directorio', etiqueta: 'Directorio' },
          { valor: 'historial', etiqueta: 'Evaluaciones realizadas' },
          { valor: 'actividades', etiqueta: 'Actividades de EyC' },
        ]}
      />
      {tab === 'directorio' && (seleccionada ? <FichaEvaluador personaId={seleccionada} onVolver={() => elegir(null)} /> : <Directorio onElegir={elegir} />)}
      {tab === 'historial' && <Historial />}
      {tab === 'actividades' && <ActividadesEyc />}
    </>
  )
}

function Directorio({ onElegir }: { onElegir: (id: string) => void }) {
  const m = useMomento()
  const [corteId, setCorteId] = useState<number | undefined>(undefined)
  const [texto, setTexto] = useState('')
  const corte = m.cortes.find((c) => c.id === (corteId ?? m.corteActivo?.id))
  const q = useMonitoreo(corte?.id)
  const evals = useEvaluaciones({ ambito: 'eyc' })
  const faseAbierta = m.faseEvaluacionAbierta

  // Evaluación directa de cada persona en el corte elegido (si existe).
  const directas = useMemo(() => {
    const mapa = new Map<string, Eval>()
    for (const e of evals.data ?? []) if (esDirecta(e) && e.corte_id === corte?.id && e.persona_id) mapa.set(e.persona_id, e)
    return mapa
  }, [evals.data, corte?.id])

  return (
    <div className="flex flex-col gap-4">
      {!faseAbierta && (
        <Aviso tono="alerta" titulo="No hay una fase de evaluación abierta" accion={{ texto: 'Abrir o cambiar la fase', a: '/configuracion?tab=fases' }}>
          Puedes consultar a los evaluadores y su historial, pero no registrar evaluaciones nuevas hasta que se abra una fase.
        </Aviso>
      )}
      <Tarjeta titulo="Integrantes de Evaluación y Control">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Selector etiqueta="Corte" value={corte?.id ?? ''} onChange={(e) => setCorteId(Number(e.target.value))}>
            {m.cortes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Selector>
          <Campo etiqueta="Buscar por nombre" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre del evaluador" />
        </div>
        <Consulta q={q}>
          {(filas) => {
            const eyc = filas.filter((r) => r.ambito === 'eyc' && r.activa && (!texto || r.nombre?.toLowerCase().includes(texto.toLowerCase())))
            if (!eyc.length)
              return (
                <EstadoVacio titulo={texto ? 'Sin coincidencias' : 'No hay integrantes de EyC registrados'}>
                  {texto ? 'Prueba con otro nombre.' : 'Regístralos en «Personas» con el ámbito «Miembro de EyC».'}
                </EstadoVacio>
              )
            return (
              <ul className="flex flex-col gap-2">
                {eyc.map((r) => {
                  const d = directas.get(r.persona_id!)
                  return (
                    <li key={r.persona_id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-accent hover:shadow-card dark:bg-white/[0.04]">
                      <div className="min-w-0 flex-1 basis-[13rem]">
                        <button type="button" onClick={() => onElegir(r.persona_id!)} className="text-left font-semibold hover:underline">
                          {r.nombre}
                        </button>
                        <p className="font-cond text-sm text-ink-3">{r.comision_sigla ?? 'Sin comisión'}</p>
                      </div>
                      {d ? <Insignia tono={d.estado === 'completa' ? 'exito' : 'alerta'}>{d.estado === 'completa' ? 'Evaluado' : 'Borrador'}</Insignia> : <Insignia>Sin evaluar</Insignia>}
                      <Semaforo semaforo={r.semaforo} puntaje={r.puntaje} n={r.n_evaluaciones} compacto />
                      <Boton variante="secundario" onClick={() => onElegir(r.persona_id!)}>
                        Ver ficha
                      </Boton>
                      {faseAbierta && (
                        <Link to={`/evaluar?persona=${r.persona_id}&directa=1`} className="inline-flex min-h-11 items-center rounded-xl bg-grad-primario px-5 text-sm font-bold text-white shadow-boton transition hover:-translate-y-px hover:brightness-110">
                          {d ? (d.estado === 'completa' ? 'Revisar' : 'Continuar') : 'Evaluar'}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            )
          }}
        </Consulta>
      </Tarjeta>
    </div>
  )
}

function FichaEvaluador({ personaId, onVolver }: { personaId: string; onVolver: () => void }) {
  const m = useMomento()
  const persona = usePersona(personaId)
  const q = useMonitoreo(m.corteActivo?.id)
  const evals = useEvaluaciones({ personaId })
  const fila = q.data?.find((r) => r.persona_id === personaId)
  const p = persona.data
  const faseAbierta = m.faseEvaluacionAbierta

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Boton variante="fantasma" onClick={onVolver}>
          ← Volver al directorio
        </Boton>
      </div>
      <Tarjeta titulo={p?.nombre ?? 'Evaluador'} accion={faseAbierta && p?.activa ? <Link to={`/evaluar?persona=${personaId}&directa=1`} className="inline-flex min-h-11 items-center rounded-xl bg-grad-primario px-5 text-sm font-bold text-white shadow-boton hover:brightness-110">Aplicar evaluación</Link> : undefined}>
        <Consulta q={persona}>
          {(d) =>
            d ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Dato etiqueta="Comisión">{d.comision_origen?.sigla ?? fila?.comision_sigla ?? '—'}</Dato>
                <Dato etiqueta="Cargo">{d.cargo_base?.nombre ?? fila?.cargo_nombre ?? '—'}</Dato>
                <Dato etiqueta="Estado">{d.activa ? 'Activo' : 'Inactivo'}</Dato>
                {fila && (
                  <div className="sm:col-span-3">
                    <p className="sobretitulo mb-1 text-acento">Monitoreo · {m.corteActivo?.nombre}</p>
                    <Semaforo semaforo={fila.semaforo} puntaje={fila.puntaje} n={fila.n_evaluaciones} />
                  </div>
                )}
                <div className="sm:col-span-3">
                  <Link to={`/personas/${personaId}`} className="font-bold text-acento">
                    Ver ficha completa de la persona →
                  </Link>
                </div>
              </div>
            ) : (
              <EstadoVacio titulo="No encontramos a esta persona" />
            )
          }
        </Consulta>
      </Tarjeta>
      <Tarjeta titulo="Historial de evaluaciones">
        <Consulta q={evals} vacio={<EstadoVacio titulo="Todavía no hay evaluaciones">Aparecerán aquí cuando se evalúe a esta persona.</EstadoVacio>}>
          {(es) => <TablaEvaluaciones filas={es} sinPersona />}
        </Consulta>
      </Tarjeta>
    </div>
  )
}

function Historial() {
  const q = useEvaluaciones({ ambito: 'eyc' })
  const [texto, setTexto] = useState('')
  return (
    <Tarjeta titulo="Evaluaciones realizadas a integrantes de EyC">
      <Campo etiqueta="Buscar por evaluado o evaluador" value={texto} onChange={(e) => setTexto(e.target.value)} className="mb-4" />
      <Consulta q={q} vacio={<EstadoVacio titulo="Todavía no hay evaluaciones">Aparecerán aquí las que se registren desde el directorio.</EstadoVacio>}>
        {(es) => {
          const t = texto.toLowerCase()
          const f = es.filter((e) => !t || e.persona_nombre?.toLowerCase().includes(t) || e.evaluador_nombre?.toLowerCase().includes(t))
          return f.length ? <TablaEvaluaciones filas={f} /> : <EstadoVacio titulo="Sin coincidencias" />
        }}
      </Consulta>
    </Tarjeta>
  )
}

function TablaEvaluaciones({ filas, sinPersona = false }: { filas: Eval[]; sinPersona?: boolean }) {
  return (
    <Tabla etiqueta="Evaluaciones">
      <thead>
        <tr>
          <th>Fecha</th>
          {!sinPersona && <th>Evaluado</th>}
          <th>Tipo</th>
          <th>Corte</th>
          <th>Evaluó</th>
          <th>Estado</th>
          <th className="text-right">Puntaje</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {filas.map((e) => (
          <tr key={e.evaluacion_id}>
            <td>{fecha(e.fecha)}</td>
            {!sinPersona && <td className="font-semibold">{e.persona_nombre}</td>}
            <td>{tipoEval(e)}</td>
            <td>{e.corte_nombre}</td>
            <td>{e.evaluador_nombre ?? '—'}</td>
            <td>
              <Insignia tono={e.estado === 'completa' ? 'exito' : 'alerta'}>{e.estado === 'completa' ? 'Completa' : 'Borrador'}</Insignia>
            </td>
            <td className="tabular text-right">{e.estado === 'completa' ? puntaje(e.puntaje) : '—'}</td>
            <td className="text-right">
              <Link to={`/evaluaciones/${e.evaluacion_id}`} className="font-bold text-acento">
                Abrir
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Tabla>
  )
}

/** Las actividades de EyC (opcionales) siguen disponibles: ligan una evaluación a una fecha concreta. */
function ActividadesEyc() {
  return <ActividadesPanel comisionId={null} ambito="eyc" />
}
