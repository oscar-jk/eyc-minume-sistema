import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMomento } from '@/app/fase'
import { Selector } from '@/components/Campo'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Insignia, Tarjeta } from '@/components/Ui'
import { ESTATUS, fecha } from '@/lib/formato'
import { useCobertura, useDashboard, type DashboardMonitoreo } from './api'

type Ambito = 'mesa' | 'eyc'
const num = (v: number | null | undefined, d = 1) => (v == null ? '—' : Number(v).toLocaleString('es-DO', { maximumFractionDigits: d, minimumFractionDigits: 0 }))

/* ───────────── Marcas gráficas (SVG/CSS, sin librerías) ───────────── */

/** Aro de avance. */
function Aro({ pct, tam = 64, trazo = 8, children }: { pct: number; tam?: number; trazo?: number; children?: ReactNode }) {
  const r = (tam - trazo) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pct))
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} aria-hidden className="-rotate-90">
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" strokeWidth={trazo} className="stroke-surface-2" />
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" strokeWidth={trazo} strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`} className="stroke-accent" />
      </svg>
      <span className="absolute font-cond text-sm font-extrabold tabular text-ink">{children ?? `${Math.round(p)}%`}</span>
    </span>
  )
}

function Kpi({ etiqueta, valor, sub, ayuda, aro, tono }: { etiqueta: string; valor: ReactNode; sub?: ReactNode; ayuda?: string; aro?: number; tono?: 'verde' | 'amarillo' | 'rojo' | 'gris' | 'acento' }) {
  const color = { verde: 'text-verde', amarillo: 'text-amarillo', rojo: 'text-rojo', gris: 'text-ink', acento: 'texto-grad' }[tono ?? 'gris']
  return (
    <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-3xl border border-line bg-surface p-4 shadow-card dark:bg-vidrio" title={ayuda}>
      <div className="min-w-0">
        <p className="sobretitulo text-ink-3">{etiqueta}</p>
        <p className={`mt-1 font-cond text-[2.6rem] font-extrabold leading-none tabular ${color}`}>{valor}</p>
        {sub && <p className="mt-1.5 text-sm text-ink-2">{sub}</p>}
      </div>
      {aro != null && <Aro pct={aro} />}
    </div>
  )
}

/** Rosquilla del semáforo con el total al centro. */
function Rosquilla({ partes, total }: { partes: { etiqueta: string; n: number; clase: string; trazo: string }[]; total: number }) {
  const tam = 168
  const trazo = 22
  const r = (tam - trazo) / 2
  const c = 2 * Math.PI * r
  let acum = 0
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <span className="relative grid place-items-center" style={{ width: tam, height: tam }}>
        <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} role="img" aria-label={`Semáforo: ${partes.map((p) => `${p.etiqueta} ${p.n}`).join(', ')}`} className="-rotate-90">
          <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" strokeWidth={trazo} className="stroke-surface-2" />
          {total > 0 &&
            partes
              .filter((p) => p.n > 0)
              .map((p) => {
                const largo = (p.n / total) * c
                const el = (
                  <circle key={p.etiqueta} cx={tam / 2} cy={tam / 2} r={r} fill="none" strokeWidth={trazo} strokeDasharray={`${Math.max(largo - 3, 0.5)} ${c}`} strokeDashoffset={-acum} className={p.trazo}>
                    <title>{`${p.etiqueta}: ${p.n}`}</title>
                  </circle>
                )
                acum += largo
                return el
              })}
        </svg>
        <span className="absolute text-center">
          <span className="block font-cond text-4xl font-extrabold leading-none tabular">{total}</span>
          <span className="text-xs font-semibold text-ink-3">personas</span>
        </span>
      </span>
      <ul className="flex flex-col gap-2">
        {partes.map((p) => (
          <li key={p.etiqueta} className="flex items-center gap-3">
            <span aria-hidden className={`size-3 rounded-full ${p.clase}`} />
            <span className="w-28 text-sm font-semibold">{p.etiqueta}</span>
            <span className="font-cond text-xl font-extrabold tabular">{p.n}</span>
            <span className="w-12 text-right text-sm text-ink-3 tabular">{total ? `${Math.round((p.n / total) * 100)} %` : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Histograma de puntajes en tramos de 10, coloreado por la banda del semáforo. */
function Histograma({ datos, verde, amarillo }: { datos: DashboardMonitoreo['distribucion']; verde: number; amarillo: number }) {
  const max = Math.max(1, ...datos.map((d) => d.n))
  const alto = 150
  return (
    <div>
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ height: alto + 22 }} role="img" aria-label={`Distribución de puntajes: ${datos.map((d) => `${d.desde} a ${d.hasta}: ${d.n}`).join(', ')}`}>
        {datos.map((d) => {
          const clase = d.desde >= verde ? 'bg-verde' : d.desde >= amarillo ? 'bg-amarillo' : 'bg-rojo'
          const h = d.n ? Math.max(6, (d.n / max) * alto) : 3
          return (
            <div key={d.desde} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.desde}–${d.hasta}: ${d.n} persona(s)`}>
              <span className="font-cond text-sm font-bold tabular text-ink-2">{d.n || ''}</span>
              <span className={`w-full rounded-t-md ${d.n ? clase : 'bg-surface-2'}`} style={{ height: h }} />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-1.5 sm:gap-2">
        {datos.map((d) => (
          <span key={d.desde} className="flex-1 text-center font-cond text-xs text-ink-3 tabular">
            {d.desde}
          </span>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rojo" /> &lt; {amarillo}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amarillo" /> {amarillo} – {verde - 1}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-verde" /> ≥ {verde}
        </span>
      </p>
    </div>
  )
}

/** Barra horizontal con valor visible y marca opcional del promedio general. */
function BarraFila({ etiqueta, sub, valor, texto, marca, clase = 'bg-grad-celeste', enlace, extra }: { etiqueta: ReactNode; sub?: ReactNode; valor: number | null; texto?: string; marca?: number | null; clase?: string; enlace?: string; extra?: ReactNode }) {
  const v = valor == null ? 0 : Math.max(0, Math.min(100, valor))
  const cuerpo = (
    <>
      <span className="truncate text-sm font-bold">{etiqueta}</span>
      {sub && <span className="block truncate text-xs text-ink-3">{sub}</span>}
    </>
  )
  return (
    <li className="grid grid-cols-[minmax(4.5rem,9rem)_1fr_auto] items-center gap-x-3 gap-y-0.5">
      <div className="min-w-0">{enlace ? <Link to={enlace} className="block hover:underline">{cuerpo}</Link> : cuerpo}</div>
      <div className="relative h-3 rounded-full bg-surface-2" role="img" aria-label={`${typeof etiqueta === 'string' ? etiqueta : ''}: ${valor == null ? 'sin datos' : valor}`}>
        <span className={`absolute inset-y-0 left-0 rounded-full ${clase}`} style={{ width: `${v}%` }} />
        {marca != null && <span aria-hidden className="absolute -inset-y-1 w-0.5 rounded bg-ink/60" style={{ left: `${Math.max(0, Math.min(100, marca))}%` }} />}
      </div>
      <span className="flex items-center justify-end gap-2">
        {extra}
        <span className="w-14 text-right font-cond text-lg font-extrabold tabular">{texto ?? num(valor)}</span>
      </span>
    </li>
  )
}

/** Línea de la evolución del promedio por día, con las bandas del semáforo como referencia. */
function Tendencia({ datos, verde, amarillo }: { datos: DashboardMonitoreo['tendencia']; verde: number; amarillo: number }) {
  const W = 640
  const H = 210
  const m = { l: 34, r: 14, t: 12, b: 28 }
  const x = (i: number) => (datos.length === 1 ? (W + m.l - m.r) / 2 : m.l + (i / (datos.length - 1)) * (W - m.l - m.r))
  const y = (v: number) => m.t + (1 - v / 100) * (H - m.t - m.b)
  const linea = datos.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.promedio).toFixed(1)}`).join(' ')
  const area = `${linea} L${x(datos.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Promedio por día: ${datos.map((d) => `${fecha(d.dia)} ${d.promedio}`).join(', ')}`}>
      <defs>
        <linearGradient id="trend-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth="1" />
          <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="fill-ink-3 font-cond text-[11px]">
            {t}
          </text>
        </g>
      ))}
      {[verde, amarillo].map((t, i) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} strokeDasharray="4 4" strokeWidth="1.2" className={i === 0 ? 'stroke-verde' : 'stroke-amarillo'} />
        </g>
      ))}
      {datos.length > 1 && <path d={area} fill="url(#trend-area)" />}
      {datos.length > 1 && <path d={linea} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="stroke-accent" />}
      {datos.map((d, i) => (
        <g key={d.dia}>
          <circle cx={x(i)} cy={y(d.promedio)} r="5.5" className="fill-accent stroke-surface" strokeWidth="2">
            <title>{`${fecha(d.dia)}: promedio ${d.promedio} · ${d.evaluaciones} evaluación(es)`}</title>
          </circle>
          <text x={x(i)} y={y(d.promedio) - 11} textAnchor="middle" className="fill-ink font-cond text-[13px] font-bold">
            {num(d.promedio)}
          </text>
          <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-ink-3 font-cond text-[11px]">
            {fecha(d.dia, true)}
          </text>
        </g>
      ))}
    </svg>
  )
}

/* ───────────── Panel ───────────── */

export function DashboardPanel() {
  const m = useMomento()
  const [corteId, setCorteId] = useState<number | undefined>(undefined)
  const [ambito, setAmbito] = useState<Ambito>('mesa')
  const corte = m.cortes.find((c) => c.id === (corteId ?? m.corteActivo?.id))
  const q = useDashboard(corte?.id, ambito)
  const cob = useCobertura()
  const faseCob = m.faseEvaluacionAbierta ?? m.vigente
  const cobTot = useMemo(() => {
    const filas = (cob.data ?? []).filter((r) => r.fase_id === faseCob?.id)
    const completas = filas.reduce((a, r) => a + (r.completas ?? 0), 0)
    const esperadas = filas.reduce((a, r) => a + (r.esperadas ?? 0), 0)
    return { completas, esperadas, pct: esperadas ? Math.min(100, Math.round((completas / esperadas) * 100)) : null }
  }, [cob.data, faseCob?.id])

  const verde = Number(corte?.umbral_verde ?? 80)
  const amarillo = Number(corte?.umbral_amarillo ?? 60)

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta>
        <div className="flex flex-wrap items-end gap-3">
          <Selector etiqueta="Corte" value={corte?.id ?? ''} onChange={(e) => setCorteId(Number(e.target.value))} className="min-w-56">
            {m.cortes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Selector>
          <div role="group" aria-label="Ámbito" className="flex gap-1 rounded-2xl bg-surface-2 p-1 dark:bg-white/[0.06]">
            {([['mesa', 'Mesa directiva'], ['eyc', 'Equipo de EyC']] as const).map(([v, t]) => (
              <button key={v} type="button" aria-pressed={ambito === v} onClick={() => setAmbito(v)} className={`min-h-11 rounded-xl px-4 font-bold transition ${ambito === v ? 'bg-grad-primario text-white shadow-boton' : 'text-ink-2 hover:text-ink'}`}>
                {t}
              </button>
            ))}
          </div>
          {corte && (
            <p className="font-cond text-sm text-ink-3 sm:ml-auto">
              Umbrales: verde ≥ {verde} · amarillo ≥ {amarillo} · rojo &lt; {amarillo}
            </p>
          )}
        </div>
      </Tarjeta>

      <Consulta q={q} filas={5} vacio={<EstadoVacio titulo="Todavía no hay datos" />}>
        {(d) => {
          const r = d.resumen
          if (r.personas === 0) return <EstadoVacio titulo="No hay personas en este ámbito y corte">Registra personas en «Personas» o cambia el ámbito.</EstadoVacio>
          const pctEval = r.personas ? Math.round((r.evaluadas / r.personas) * 100) : 0
          const tonoProm = r.promedio == null ? 'gris' : r.promedio >= verde ? 'verde' : r.promedio >= amarillo ? 'amarillo' : 'rojo'
          const porAtender = r.elevados_pendientes + r.rojos_sin_recomendacion
          const peorDim = d.por_dimension.length ? d.por_dimension.reduce((a, b) => (b.promedio < a.promedio ? b : a)) : null
          const mejorDim = d.por_dimension.length ? d.por_dimension.reduce((a, b) => (b.promedio > a.promedio ? b : a)) : null
          const secciones = [...new Set(d.por_dimension.map((x) => x.seccion ?? ''))]
          return (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi etiqueta="Personas evaluadas" valor={<>{r.evaluadas}<span className="text-xl text-ink-3"> / {r.personas}</span></>} sub={`${pctEval} % con al menos una evaluación completa`} aro={pctEval} tono="acento" />
                <Kpi etiqueta="Promedio del corte" valor={num(r.promedio)} sub={r.promedio == null ? 'Sin evaluaciones completas' : <>Mediana {num(r.mediana)} · rango {num(r.minimo, 0)}–{num(r.maximo, 0)}</>} tono={tonoProm} ayuda="Promedio de los puntajes del corte de las personas con evaluaciones completas." />
                <Kpi etiqueta="Evaluaciones completas" valor={r.evaluaciones_completas} sub={<>{r.borradores} borrador(es){cobTot.pct != null && <> · cobertura {cobTot.pct} % ({cobTot.completas} de {cobTot.esperadas})</>}</>} aro={cobTot.pct ?? undefined} />
                <Kpi etiqueta="Casos por atender" valor={porAtender} tono={porAtender ? 'rojo' : 'verde'} sub={porAtender ? `${r.elevados_pendientes} elevado(s) sin decidir · ${r.rojos_sin_recomendacion} en rojo sin recomendación` : 'Nada pendiente de recomendar o decidir'} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Tarjeta titulo="Semáforo del corte">
                  <Rosquilla
                    total={r.personas}
                    partes={[
                      { etiqueta: 'Cumple', n: r.verde, clase: 'bg-verde', trazo: 'stroke-verde' },
                      { etiqueta: 'Seguimiento', n: r.amarillo, clase: 'bg-amarillo', trazo: 'stroke-amarillo' },
                      { etiqueta: 'En riesgo', n: r.rojo, clase: 'bg-rojo', trazo: 'stroke-rojo' },
                      { etiqueta: 'No evaluado', n: r.gris, clase: 'bg-gris', trazo: 'stroke-gris' },
                    ]}
                  />
                  <p className="mt-4 text-center text-sm text-ink-3">
                    {r.con_recomendacion} con recomendación · {r.decididos} con decisión registrada
                  </p>
                </Tarjeta>
                <Tarjeta titulo="Distribución de puntajes">
                  {r.evaluadas ? <Histograma datos={d.distribucion} verde={verde} amarillo={amarillo} /> : <EstadoVacio titulo="Sin puntajes todavía" />}
                </Tarjeta>
              </div>

              <Tarjeta titulo="Promedio por comisión" accion={<span className="text-xs text-ink-3">La marca vertical es el promedio general</span>}>
                {d.por_comision.length ? (
                  <ul className="flex flex-col gap-3">
                    {d.por_comision.map((c) => (
                      <BarraFila
                        key={c.comision_id}
                        etiqueta={c.sigla}
                        sub={`${c.evaluadas} de ${c.personas} evaluadas`}
                        valor={c.promedio}
                        marca={r.promedio}
                        enlace={`/comisiones/${c.comision_id}`}
                        clase={c.promedio == null ? 'bg-gris' : c.promedio >= verde ? 'bg-grad-celeste' : c.promedio >= amarillo ? 'bg-amarillo' : 'bg-rojo'}
                        extra={
                          <span className="hidden items-center gap-1 sm:flex" aria-label={`${c.verde} cumple, ${c.amarillo} seguimiento, ${c.rojo} en riesgo`}>
                            {c.verde > 0 && <Insignia tono="exito">{c.verde}</Insignia>}
                            {c.amarillo > 0 && <Insignia tono="alerta">{c.amarillo}</Insignia>}
                            {c.rojo > 0 && <Insignia tono="peligro">{c.rojo}</Insignia>}
                          </span>
                        }
                      />
                    ))}
                  </ul>
                ) : (
                  <EstadoVacio titulo="Sin comisiones con personas" />
                )}
              </Tarjeta>

              <div className="grid gap-4 lg:grid-cols-2">
                <Tarjeta titulo="Evolución del promedio">
                  {d.tendencia.length ? (
                    <>
                      <Tendencia datos={d.tendencia} verde={verde} amarillo={amarillo} />
                      <p className="mt-1 text-xs text-ink-3">Línea verde y amarilla: umbrales del corte. Cada punto es el promedio de las evaluaciones completas de ese día.</p>
                    </>
                  ) : (
                    <EstadoVacio titulo="Aún no hay evaluaciones completas con fecha" />
                  )}
                </Tarjeta>
                <Tarjeta titulo="Promedio por cargo">
                  {d.por_cargo.some((c) => c.promedio != null) ? (
                    <ul className="flex flex-col gap-3">
                      {d.por_cargo.map((c) => (
                        <BarraFila key={c.cargo} etiqueta={c.cargo} sub={`${c.evaluadas} evaluada(s)`} valor={c.promedio} marca={r.promedio} />
                      ))}
                    </ul>
                  ) : (
                    <EstadoVacio titulo="Sin puntajes por cargo todavía" />
                  )}
                </Tarjeta>
              </div>

              <Tarjeta
                titulo={ambito === 'mesa' ? 'Desempeño por criterio de la rúbrica' : 'Desempeño por dimensión'}
                accion={peorDim && mejorDim ? <span className="text-xs text-ink-3">Más fuerte: {mejorDim.nombre} · A reforzar: {peorDim.nombre}</span> : undefined}
              >
                {d.por_dimension.length ? (
                  <div className="flex flex-col gap-5">
                    {secciones.map((sec) => (
                      <div key={sec}>
                        {sec && <p className="sobretitulo mb-2 text-acento">{sec}</p>}
                        <ul className="flex flex-col gap-3">
                          {d.por_dimension
                            .filter((x) => (x.seccion ?? '') === sec)
                            .map((x) => (
                              <BarraFila
                                key={x.clave}
                                etiqueta={`${x.clave}. ${x.nombre}`}
                                sub={`${x.observaciones} observación(es)${x.puntos ? ` · vale ${num(x.puntos, 0)} pts` : ''}`}
                                valor={x.promedio}
                                texto={`${num(x.promedio, 0)} %`}
                                clase={x === peorDim ? 'bg-amarillo' : 'bg-grad-celeste'}
                              />
                            ))}
                        </ul>
                      </div>
                    ))}
                    <p className="text-xs text-ink-3">Cada barra es el logro promedio sobre 100 en ese criterio, solo con las veces que se observó (N/A no cuenta).</p>
                  </div>
                ) : (
                  <EstadoVacio titulo="Sin evaluaciones completas todavía" />
                )}
              </Tarjeta>

              <div className="grid gap-4 lg:grid-cols-2">
                <Tarjeta titulo="Mejores puntajes">
                  <Lista filas={d.mejores} />
                </Tarjeta>
                <Tarjeta titulo="Requieren atención">
                  <Lista filas={d.atencion} atencion />
                </Tarjeta>
              </div>
            </>
          )
        }}
      </Consulta>
    </div>
  )
}

function Lista({ filas, atencion = false }: { filas: DashboardMonitoreo['mejores'] | DashboardMonitoreo['atencion']; atencion?: boolean }) {
  if (!filas.length) return <EstadoVacio titulo="Sin datos todavía" />
  return (
    <ol className="flex flex-col gap-2">
      {filas.map((f, i) => {
        const sem = 'semaforo' in f ? f.semaforo : 'verde'
        const color = sem === 'rojo' ? 'text-rojo' : sem === 'amarillo' ? 'text-amarillo' : sem === 'verde' ? 'text-verde' : 'text-gris'
        return (
          <li key={f.persona_id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-all hover:border-accent hover:shadow-card dark:bg-white/[0.04]">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft font-cond text-sm font-extrabold text-acento tabular">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <Link to={`/personas/${f.persona_id}`} className="block truncate font-semibold hover:underline">
                {f.nombre}
              </Link>
              <p className="truncate font-cond text-sm text-ink-3">
                {f.comision ?? 'Sin comisión'} · {f.n} evaluación(es)
                {atencion && 'recomendacion' in f && f.recomendacion ? ` · Rec.: ${ESTATUS[f.recomendacion as keyof typeof ESTATUS] ?? f.recomendacion}` : ''}
              </p>
            </div>
            <span className={`font-cond text-2xl font-extrabold tabular ${color}`}>{num(f.puntaje)}</span>
          </li>
        )
      })}
    </ol>
  )
}
