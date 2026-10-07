import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMomento } from '@/app/fase'
import { Boton } from '@/components/Boton'
import { Campo, Selector } from '@/components/Campo'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Semaforo } from '@/components/Semaforo'
import { Acento, Aviso, Insignia, Pestanas, Tabla, Tarjeta, Titulo } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { ActividadesPanel } from '@/features/actividades/ActividadesPanel'
import { useActividades } from '@/features/actividades/api'
import { useCargos, useComisiones } from '@/features/comisiones/api'
import { useValidezPesos } from '@/features/configuracion/api'
import { RecomendacionModal, type FilaRecomendable } from '@/features/continuidad/Modales'
import { AMBITO, ESTATUS, SEMAFORO, fecha } from '@/lib/formato'
import type { Ambito, Estatus, Semaforo as TSemaforo } from '@/lib/tipos'
import { useCobertura, useMonitoreo } from './api'

type Tab = 'semaforo' | 'cobertura' | 'eyc'
const ORDEN: TSemaforo[] = ['rojo', 'amarillo', 'verde', 'gris']

export function MonitoreoPage() {
  const { perfil } = useSesion()
  const [tab, setTab] = useState<Tab>('semaforo')
  const evaluaEyc = perfil?.rol === 'subsecretario' || perfil?.rol === 'admin'
  return (
    <>
      <Titulo sobre="Subsecretaría" adorno="circulos" sub="Desempeño por corte, cobertura de evaluación y recomendaciones">
        Monitoreo <Acento>del</Acento> desempeño
      </Titulo>
      <AvisoPesos />
      <Pestanas
        etiqueta="Vistas de monitoreo"
        valor={tab}
        onCambio={setTab}
        opciones={[
          { valor: 'semaforo', etiqueta: 'Semáforo' },
          { valor: 'cobertura', etiqueta: 'Cobertura' },
          ...(evaluaEyc ? [{ valor: 'eyc' as const, etiqueta: 'Evaluar EyC' }] : []),
        ]}
      />
      {tab === 'semaforo' && <SemaforoPanel />}
      {tab === 'cobertura' && <CoberturaPanel />}
      {tab === 'eyc' && <EvaluarEycPanel />}
    </>
  )
}

function AvisoPesos() {
  const q = useValidezPesos()
  if (!q.data) return null
  const malos = q.data.ambitos.filter((a) => !a.valido)
  if (!malos.length && q.data.cortes.valido) return null
  return (
    <div className="mb-4">
      <Aviso tono="peligro" titulo="Cálculo bloqueado">
        {malos.map((a) => (
          <span key={a.ambito} className="block">
            Pesos de {AMBITO[a.ambito!]}: suman {a.suma} ({Number(a.diferencia) > 0 ? `faltan ${a.diferencia}` : `sobran ${-Number(a.diferencia)}`}).
          </span>
        ))}
        {!q.data.cortes.valido && <span className="block">Los pesos de los cortes suman {q.data.cortes.suma}, no 100.</span>}
      </Aviso>
    </div>
  )
}

function SemaforoPanel() {
  const m = useMomento()
  const { perfil } = useSesion()
  const recomienda = perfil?.rol === 'subsecretario' || perfil?.rol === 'admin'
  const comisiones = useComisiones()
  const cargos = useCargos()
  const [corteId, setCorteId] = useState<number | undefined>(undefined)
  const corte = m.cortes.find((c) => c.id === (corteId ?? m.corteActivo?.id))
  const q = useMonitoreo(corte?.id)
  const [f, setF] = useState({ comision: '', cargo: '', ambito: '' as '' | Ambito, estatus: '' as '' | Estatus, texto: '', inactivas: false })
  const [rec, setRec] = useState<FilaRecomendable | null>(null)
  const [verFiltros, setVerFiltros] = useState(false)
  const [soloSem, setSoloSem] = useState<TSemaforo | null>(null)
  const corteAbierto = m.abiertas.some((x) => x.corte_id === corte?.id)

  const filtradas = useMemo(
    () =>
      (q.data ?? []).filter(
        (r) =>
          (f.inactivas || r.activa) &&
          (!f.comision || String(r.comision_id) === f.comision) &&
          (!f.cargo || String(r.cargo_id) === f.cargo) &&
          (!f.ambito || r.ambito === f.ambito) &&
          (!f.estatus || r.estatus === f.estatus) &&
          (!f.texto || r.nombre?.toLowerCase().includes(f.texto.toLowerCase())),
      ),
    [q.data, f],
  )

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Selector etiqueta="Corte" value={corte?.id ?? ''} onChange={(e) => setCorteId(Number(e.target.value))}>
            {m.cortes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Selector>
          <div id="filtros-monitoreo" className={verFiltros ? 'contents' : 'contents max-sm:hidden'}>
          <Selector etiqueta="Comisión" value={f.comision} onChange={(e) => setF({ ...f, comision: e.target.value })}>
            <option value="">Todas</option>
            {comisiones.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.sigla ?? c.nombre}
              </option>
            ))}
          </Selector>
          <Selector etiqueta="Cargo" value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })}>
            <option value="">Todos</option>
            {cargos.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Selector>
          <Selector etiqueta="Ámbito" value={f.ambito} onChange={(e) => setF({ ...f, ambito: e.target.value as Ambito | '' })}>
            <option value="">Todos</option>
            <option value="mesa">{AMBITO.mesa}</option>
            <option value="eyc">{AMBITO.eyc}</option>
          </Selector>
          <Selector etiqueta="Continuidad" value={f.estatus} onChange={(e) => setF({ ...f, estatus: e.target.value as Estatus | '' })}>
            <option value="">Todas</option>
            {Object.entries(ESTATUS).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </Selector>
          <Campo etiqueta="Buscar" type="search" value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} placeholder="Nombre" />
          </div>
        </div>
        <button
          type="button"
          className="mt-3 min-h-11 font-semibold text-accent sm:hidden"
          aria-expanded={verFiltros}
          aria-controls="filtros-monitoreo"
          onClick={() => setVerFiltros((v) => !v)}
        >
          {verFiltros ? 'Ocultar filtros' : 'Más filtros'}
        </button>
        <label className={`mt-3 min-h-11 items-center gap-2 text-sm ${verFiltros ? 'flex' : 'hidden sm:flex'}`}>
          <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={f.inactivas} onChange={(e) => setF({ ...f, inactivas: e.target.checked })} />
          Incluir personas sustituidas (inactivas)
        </label>
        {corte && (
          <p className="mt-1 font-cond text-sm text-ink-3">
            Umbrales de {corte.nombre}: verde ≥ {corte.umbral_verde} · amarillo ≥ {corte.umbral_amarillo} · rojo &lt; {corte.umbral_amarillo}
          </p>
        )}
      </Tarjeta>

      {filtradas.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Resumen por semáforo (toca para filtrar)">
          {ORDEN.map((s) => {
            const n = filtradas.filter((r) => (r.semaforo ?? 'gris') === s).length
            const activo = soloSem === s
            // Cada estado con identidad propia: tinte de fondo, franja en degradado y punto luminoso.
            const est = {
              rojo: { txt: 'text-rojo', caja: 'bg-rojo-bg ring-rojo/25', franja: 'from-[#e53535] to-[#ff7aa8]', punto: 'bg-rojo' },
              amarillo: { txt: 'text-amarillo', caja: 'bg-amarillo-bg ring-amarillo/25', franja: 'from-[#f5a300] to-[#ffd84d]', punto: 'bg-amarillo' },
              verde: { txt: 'text-verde', caja: 'bg-verde-bg ring-verde/25', franja: 'from-[#14a34a] to-[#6ee7a0]', punto: 'bg-verde' },
              gris: { txt: 'text-gris', caja: 'bg-gris-bg ring-gris/20', franja: 'from-[#6b7c99] to-[#b6c5de]', punto: 'bg-gris' },
            }[s]
            return (
              <button
                key={s}
                type="button"
                aria-pressed={activo}
                onClick={() => setSoloSem(activo ? null : s)}
                className={`relative overflow-hidden rounded-3xl p-4 pt-5 text-left shadow-card ring-1 transition hover:-translate-y-0.5 ${
                  activo ? 'bg-grad-primario text-white ring-transparent' : est.caja
                }`}
              >
                <span aria-hidden className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${est.franja}`} />
                <span className="flex items-center justify-between">
                  <span className={`font-cond text-5xl font-extrabold leading-none tabular ${activo ? '' : est.txt}`}>{n}</span>
                  <span aria-hidden className={`size-3 rounded-full ${est.punto} shadow-[0_0_14px_currentColor] ${est.txt}`} />
                </span>
                <span className={`mt-1 block text-sm font-extrabold ${activo ? '' : est.txt}`}>{SEMAFORO[s].etiqueta}</span>
                <span className={`block text-xs ${activo ? 'text-white/80' : 'text-ink-3'}`}>{activo ? 'Filtro activo · toca para quitar' : 'Toca para filtrar'}</span>
              </button>
            )
          })}
        </div>
      )}

      <Consulta q={q} filas={6} vacio={<EstadoVacio titulo="Aún no hay personas registradas" />}>
        {() =>
          filtradas.length === 0 ? (
            <EstadoVacio titulo="Nadie coincide con los filtros" />
          ) : (
            ORDEN.filter((s) => !soloSem || s === soloSem).map((s) => {
              const grupo = filtradas.filter((r) => (r.semaforo ?? 'gris') === s)
              if (!grupo.length) return null
              return (
                <Tarjeta
                  key={s}
                  titulo={
                    <span className="flex items-center gap-2">
                      {SEMAFORO[s].etiqueta} <Insignia>{grupo.length}</Insignia>
                    </span>
                  }
                >
                  <ul className="flex flex-col gap-2">
                    {grupo.map((r) => (
                      <li key={r.persona_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-accent hover:shadow-card dark:bg-white/[0.04]">
                        <div className="min-w-0 flex-1 basis-48">
                          <Link to={`/personas/${r.persona_id}`} className="font-semibold hover:underline">
                            {r.nombre}
                          </Link>
                          <p className="font-cond text-sm text-ink-3">
                            {r.comision_sigla ?? r.comision_nombre ?? 'Sin asignación vigente'} · {r.cargo_nombre ?? AMBITO[r.ambito!]}
                            {!r.activa && ' · inactiva'}
                          </p>
                        </div>
                        <Semaforo semaforo={r.semaforo} puntaje={r.puntaje} n={r.n_evaluaciones} compacto />
                        {r.n_borradores ? <Insignia tono="alerta">{r.n_borradores} borrador(es)</Insignia> : null}
                        <Insignia tono={r.estatus === 'sustitucion' ? 'peligro' : r.estatus === 'seguimiento' ? 'alerta' : r.estatus === 'continua' ? 'exito' : 'neutro'}>
                          {ESTATUS[r.estatus ?? 'no_evaluado']}
                        </Insignia>
                        {r.recomendacion && (
                          <Insignia tono="acento">
                            Rec.: {ESTATUS[r.recomendacion]}
                            {r.decision_id ? ' · decidida' : r.elevada ? ' · elevada' : ' · pendiente'}
                          </Insignia>
                        )}
                        {recomienda && corteAbierto && r.activa && !r.decision_id && (
                          <Boton variante="secundario" onClick={() => setRec(r)}>
                            {r.recomendacion ? 'Editar' : 'Recomendar'}
                          </Boton>
                        )}
                      </li>
                    ))}
                  </ul>
                </Tarjeta>
              )
            })
          )
        }
      </Consulta>
      {rec && <RecomendacionModal key={`${rec.persona_id}-${rec.corte_id}`} fila={rec} onCerrar={() => setRec(null)} />}
    </div>
  )
}

function CoberturaPanel() {
  const m = useMomento()
  const q = useCobertura()
  const fasesEval = m.fases.filter((x) => x.tipo === 'evaluacion')
  const [faseId, setFaseId] = useState<number | undefined>(undefined)
  const fase = fasesEval.find((x) => x.id === (faseId ?? m.faseEvaluacionAbierta?.id ?? fasesEval[0]?.id))

  return (
    <Tarjeta
      titulo="Cobertura por comisión"
      accion={
        <Selector etiqueta="Fase" value={fase?.id ?? ''} onChange={(e) => setFaseId(Number(e.target.value))} className="min-w-56">
          {fasesEval.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nombre}
            </option>
          ))}
        </Selector>
      }
    >
      <p className="mb-3 text-sm text-ink-2">
        {fase?.es_evento
          ? 'Esperadas: una evaluación por persona y jornada transcurrida.'
          : 'Esperadas: una evaluación por persona de la mesa y actividad de la comisión (o general).'}
      </p>
      <Consulta q={q}>
        {(filas) => {
          const deFase = filas.filter((r) => r.fase_id === fase?.id)
          return (
            <Tabla etiqueta="Cobertura de evaluación">
              <thead>
                <tr>
                  <th>Comisión</th>
                  <th className="text-right">Completas</th>
                  <th className="text-right">Borradores</th>
                  <th className="text-right">Esperadas</th>
                  <th className="w-1/3">Avance</th>
                </tr>
              </thead>
              <tbody>
                {deFase.map((r) => {
                  const pct = Number(r.porcentaje ?? 0)
                  const alDia = (r.esperadas ?? 0) > 0 && pct >= 100
                  return (
                    <tr key={r.comision_id}>
                      <td>
                        <Link to={`/comisiones/${r.comision_id}`} className="font-bold text-acento hover:underline">
                          {r.comision_sigla ?? r.comision_nombre}
                        </Link>
                      </td>
                      <td className="tabular text-right">{r.completas}</td>
                      <td className="tabular text-right">{r.borradores}</td>
                      <td className="tabular text-right">{r.esperadas}</td>
                      <td>
                        {(r.esperadas ?? 0) === 0 ? (
                          <span className="text-ink-3">Sin evaluaciones esperadas aún</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                              <div className={`h-full rounded-full ${alDia ? 'bg-verde' : pct >= 50 ? 'bg-amarillo' : 'bg-rojo'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="tabular w-24 text-right font-semibold">
                              {pct}% {alDia ? '· al día' : ''}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Tabla>
          )
        }}
      </Consulta>
    </Tarjeta>
  )
}

/** La Subsecretaría evalúa a los miembros de EyC (por actividad antes del evento, por jornada durante el evento). */
function EvaluarEycPanel() {
  const m = useMomento()
  const corte = m.corteActivo
  const q = useMonitoreo(corte?.id)
  const actividades = useActividades({ ambito: 'eyc' })
  const faseEvento = m.abiertas.find((f) => f.es_evento && f.tipo === 'evaluacion')
  const [actividad, setActividad] = useState('')
  const abiertas = (actividades.data ?? []).filter((a) => !a.cerrada && a.fase?.estado === 'abierta')
  const ref = faseEvento ? `fecha=${m.hoy}` : actividad ? `actividad=${actividad}` : ''

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta titulo="Miembros de Evaluación y Control">
        {faseEvento ? (
          <p className="mb-3 text-sm text-ink-2">Evaluación de la jornada de hoy ({fecha(m.hoy)}).</p>
        ) : (
          <Selector etiqueta="Actividad a evaluar" value={actividad} onChange={(e) => setActividad(e.target.value)} className="mb-3">
            <option value="">Elige una actividad de EyC…</option>
            {abiertas.map((a) => (
              <option key={a.id} value={a.id}>
                {fecha(a.fecha)} · {a.nombre}
              </option>
            ))}
          </Selector>
        )}
        <Consulta q={q}>
          {(filas) => {
            const eyc = filas.filter((r) => r.ambito === 'eyc' && r.activa)
            if (!eyc.length) return <EstadoVacio titulo="No hay miembros de EyC registrados">Regístralos en «Personas» con el ámbito «Miembro de EyC».</EstadoVacio>
            return (
              <ul className="flex flex-col gap-2">
                {eyc.map((r) => (
                  <li key={r.persona_id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-accent hover:shadow-card dark:bg-white/[0.04]">
                    <div className="min-w-0 flex-1 basis-[13rem]">
                      <Link to={`/personas/${r.persona_id}`} className="font-semibold hover:underline">
                        {r.nombre}
                      </Link>
                      <p className="font-cond text-sm text-ink-3">{r.comision_sigla ?? 'Sin comisión'}</p>
                    </div>
                    <Semaforo semaforo={r.semaforo} puntaje={r.puntaje} n={r.n_evaluaciones} compacto />
                    {ref && (
                      <Link to={`/evaluar?persona=${r.persona_id}&${ref}`} className="inline-flex min-h-11 items-center rounded-xl bg-grad-primario px-5 text-sm font-bold text-white shadow-boton transition hover:-translate-y-px hover:brightness-110">
                        Evaluar
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )
          }}
        </Consulta>
      </Tarjeta>
      {!faseEvento && <ActividadesPanel comisionId={null} ambito="eyc" />}
    </div>
  )
}
