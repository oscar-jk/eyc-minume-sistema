import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMomento } from '@/app/fase'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { Campo, Selector } from '@/components/Campo'
import { Consulta } from '@/components/Estados'
import { Modal } from '@/components/Modal'
import { Aviso, Insignia, Tabla, Tarjeta } from '@/components/Ui'
import { useComisionesVisitadas, useMoverAsignaciones, usePuntuacionRotacion, useVigentes } from '@/features/asignaciones/api'
import {
  SESIONES_DIAS_POR_DEFECTO,
  SESIONES_INICIO_POR_DEFECTO,
  SIN_ROTACION_POR_DEFECTO,
  cambiarDestino,
  claveDestino,
  diaDeSesiones,
  esRotable,
  inicioDelDia,
  movimientosDelPlan,
  revisarPlan,
  planInicial,
  type Casilla,
  type Plan,
} from '@/features/asignaciones/rotacion'
import { siglaDe, useCargos, useComisiones } from '@/features/comisiones/api'
import { useConfig, useGuardarConfig } from '@/features/configuracion/api'
import { mensajeError } from '@/lib/errores'
import { fecha, puntaje } from '@/lib/formato'

/** Lee la regla «comisiones que no rotan» y las fechas de sesiones desde la configuración (con valores por defecto). */
function useReglas() {
  const config = useConfig()
  const c = config.data ?? {}
  const sin = Array.isArray(c.comisiones_sin_rotacion?.valor) ? (c.comisiones_sin_rotacion.valor as string[]) : SIN_ROTACION_POR_DEFECTO
  const inicio = typeof c.sesiones_inicio?.valor === 'string' ? (c.sesiones_inicio.valor as string) : SESIONES_INICIO_POR_DEFECTO
  const dias = typeof c.sesiones_dias?.valor === 'number' ? (c.sesiones_dias.valor as number) : SESIONES_DIAS_POR_DEFECTO
  return { sinRotacion: sin, inicio, dias, cargando: config.isPending }
}

/** Planificador de la rotación de un día de sesiones: cada miembro de mesa pasa a otra comisión; EyC, aprendices y CIJ se quedan. */
export function RotacionesPanel() {
  const [dia, setDia] = useState(2)
  const reglas = useReglas()
  const vigentes = useVigentes()
  const visitadas = useComisionesVisitadas()
  const comisiones = useComisiones()
  const cargos = useCargos()
  const m = useMomento()
  const mover = useMoverAsignaciones()
  const punt = usePuntuacionRotacion(dia)
  const avisar = useAvisar()
  const [edicion, setEdicion] = useState<Plan | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const [orden, setOrden] = useState<'comision' | 'puntuacion'>('comision')

  const sinSet = useMemo(() => new Set(reglas.sinRotacion), [reglas.sinRotacion])
  const clavePorCargo = useMemo(() => new Map((cargos.data ?? []).map((c) => [c.id, c.clave])), [cargos.data])
  const ordenComision = useMemo(() => new Map((comisiones.data ?? []).map((c) => [c.id, c.orden])), [comisiones.data])

  const filas = useMemo(() => vigentes.data ?? [], [vigentes.data])
  const rotan = useMemo(
    () => filas.filter((f) => esRotable({ ambito: f.ambito, cargoClave: clavePorCargo.get(f.cargo_id ?? -1) ?? null, comisionClave: f.comision_clave }, sinSet)),
    [filas, clavePorCargo, sinSet],
  )
  const fijos = useMemo(() => filas.filter((f) => !rotan.includes(f)), [filas, rotan])

  const casillas: Casilla[] = useMemo(
    () => rotan.map((f) => ({ personaId: f.persona_id!, comisionId: f.comision_id!, cargoId: f.cargo_id!, orden: ordenComision.get(f.comision_id!) ?? 0 })),
    [rotan, ordenComision],
  )
  const historial = useMemo(() => visitadas.data ?? new Map<string, Set<number>>(), [visitadas.data])
  const base = useMemo(() => planInicial(casillas), [casillas])
  const plan = edicion ?? base
  const revision = useMemo(() => revisarPlan(plan, casillas, historial), [plan, casillas, historial])
  const movs = useMemo(() => movimientosDelPlan(plan, casillas), [plan, casillas])

  // Lugares a los que se puede mandar a alguien: comisiones que rotan × cargos de dirección de mesa.
  const lugares = useMemo(() => {
    const cargosRot = (cargos.data ?? []).filter((c) => c.ambito === 'mesa' && c.clave !== 'aprendiz')
    return (comisiones.data ?? [])
      .filter((c) => c.activa && !sinSet.has(c.clave))
      .flatMap((c) => cargosRot.map((g) => ({ comisionId: c.id, cargoId: g.id, orden: c.orden * 10 + g.orden })))
      .sort((a, b) => a.orden - b.orden)
  }, [comisiones.data, cargos.data, sinSet])
  const ocupante = (comisionId: number, cargoId: number) => {
    const quien = [...plan.entries()].find(([, d]) => d.comisionId === comisionId && d.cargoId === cargoId)
    return quien ? porPersona.get(quien[0])?.persona_nombre : undefined
  }

  const fechaDia = diaDeSesiones(reglas.inicio, dia)
  const rotacionPermitida = m.abiertas.some((f) => f.permite_rotacion)
  const yaRotado = rotan.some((f) => f.motivo === 'rotacion' && f.desde && f.desde.slice(0, 10) >= fechaDia)

  const porPersona = new Map(rotan.map((f) => [f.persona_id!, f]))
  const puntosDe = new Map((punt.data ?? []).map((x) => [x.persona_id, x]))
  const pesosInvalidos = (punt.data ?? []).some((x) => x.pesos_validos === false)
  const nombreComision = (id: number) => siglaDe(comisiones.data?.find((c) => c.id === id))
  const nombreCargo = (id: number) => cargos.data?.find((c) => c.id === id)?.nombre ?? ''

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta titulo="Cómo rota la mesa">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-2">
          <li>
            <strong>No rota la mesa completa:</strong> la Subsecretaría de Evaluación y Control decide a qué comisión y con qué cargo va cada miembro de mesa, persona por persona. Si eliges el lugar de
            otra persona, ella recibe el tuyo.
          </li>
          <li>
            <strong>Se quedan fijos</strong> los miembros de EyC, los aprendices y las comisiones que no rotan (CIJ).
          </li>
          <li>
            El <strong>Día 1</strong> ({fecha(diaDeSesiones(reglas.inicio, 1), true)}) cada quien está en su comisión. El <strong>Día 2</strong> y el <strong>Día 3</strong> se rota, y cada día a una
            comisión diferente.
          </li>
        </ul>
      </Tarjeta>

      <Tarjeta
        titulo="Rotación del día"
        accion={
          <Selector etiqueta="Día de sesiones" value={String(dia)} onChange={(e) => {
              setDia(Number(e.target.value))
              setEdicion(null)
            }} className="min-w-56">
            {Array.from({ length: Math.max(0, reglas.dias - 1) }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>
                Día {n} · {fecha(diaDeSesiones(reglas.inicio, n), true)}
              </option>
            ))}
          </Selector>
        }
      >
        {!rotacionPermitida && (
          <div className="mb-4">
            <Aviso tono="alerta" titulo="La fase actual no permite rotar" accion={{ texto: 'Abrir o cambiar la fase', a: '/configuracion?tab=fases' }}>
              Puedes preparar el plan, pero solo se puede aplicar cuando esté abierta una fase de evento.
            </Aviso>
          </div>
        )}
        {pesosInvalidos && (
          <div className="mb-4">
            <Aviso tono="alerta" titulo="La puntuación está en pausa">
              Los pesos de este día no suman 100. Corrígelos en «Pesos de la puntuación» (más abajo).
            </Aviso>
          </div>
        )}
        {yaRotado && (
          <div className="mb-4">
            <Aviso tono="info" titulo="Ya hay una rotación registrada ese día o después">
              Revisa las asignaciones vigentes antes de aplicar otra rotación.
            </Aviso>
          </div>
        )}
        <Consulta q={vigentes}>
          {() =>
            rotan.length === 0 ? (
              <Aviso tono="info" titulo="Todavía no hay miembros de mesa para rotar" accion={{ texto: 'Registrar personas', a: '/personas' }}>
                Registra y asigna a la mesa directiva en «Alta individual» o «Carga masiva».
              </Aviso>
            ) : (
              <div className="flex flex-col gap-4">
                <Tabla etiqueta={`Plan de rotación del día ${dia}`}>
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Ahora</th>
                      <th>Puntuación</th>
                      <th>Pasa a</th>
                      <th>
                        <span className="sr-only">Avisos</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {casillas
                      .slice()
                      .sort((a, b) =>
                        orden === 'puntuacion'
                          ? (puntosDe.get(b.personaId)?.total ?? -1) - (puntosDe.get(a.personaId)?.total ?? -1) || a.orden - b.orden
                          : a.orden - b.orden || a.cargoId - b.cargoId,
                      )
                      .map((c) => {
                        const f = porPersona.get(c.personaId)!
                        const d = plan.get(c.personaId)!
                        return (
                          <tr key={c.personaId}>
                            <td>
                              <Link to={`/personas/${c.personaId}`} className="font-bold text-acento hover:underline">
                                {f.persona_nombre}
                              </Link>
                            </td>
                            <td>
                              {nombreComision(c.comisionId)} · {nombreCargo(c.cargoId)}
                            </td>
                            <td>
                              <Puntuacion x={puntosDe.get(c.personaId)} />
                            </td>
                            <td>
                              <select
                                aria-label={`Destino de ${f.persona_nombre}`}
                                value={claveDestino(d)}
                                onChange={(e) => {
                                  const x = lugares.find((k) => claveDestino(k) === e.target.value)
                                  if (x) setEdicion(cambiarDestino(plan, c.personaId, { comisionId: x.comisionId, cargoId: x.cargoId }))
                                }}
                                className="min-h-10 w-full min-w-44 rounded-lg border border-line bg-surface px-2 text-sm text-ink hover:border-line-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 dark:bg-white/[0.06]"
                              >
                                {lugares.map((k) => {
                                  const quien = ocupante(k.comisionId, k.cargoId)
                                  const propio = k.comisionId === c.comisionId && k.cargoId === c.cargoId
                                  return (
                                    <option key={claveDestino(k)} value={claveDestino(k)}>
                                      {propio ? 'Se queda · ' : ''}
                                      {nombreComision(k.comisionId)} · {nombreCargo(k.cargoId)}
                                      {quien && !propio ? ` (hoy: ${quien})` : ''}
                                    </option>
                                  )
                                })}
                              </select>
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-1">
                                {revision.repiten.includes(c.personaId) && <Insignia tono="alerta">Ya estuvo ahí</Insignia>}
                                {revision.sinCambio.includes(c.personaId) && <Insignia>Se queda</Insignia>}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </Tabla>

                <p className="text-sm text-ink-2">
                  <strong>{movs.length}</strong> persona{movs.length === 1 ? '' : 's'} cambia{movs.length === 1 ? '' : 'n'} de comisión
                  {revision.sinCambio.length > 0 && <> · {revision.sinCambio.length} se queda{revision.sinCambio.length === 1 ? '' : 'n'}</>}
                  {revision.repiten.length > 0 && <> · {revision.repiten.length} vuelve{revision.repiten.length === 1 ? '' : 'n'} a una comisión que ya conoc{revision.repiten.length === 1 ? 'ía' : 'ían'}</>}. El historial de cada persona se conserva.
                </p>

                {mover.isError && <Aviso tono="peligro">{mensajeError(mover.error)}</Aviso>}
                <div className="flex flex-wrap items-end gap-2">
                  <Selector etiqueta="Ordenar por" value={orden} onChange={(e) => setOrden(e.target.value as 'comision' | 'puntuacion')} className="min-w-44">
                    <option value="comision">Comisión</option>
                    <option value="puntuacion">Puntuación (mayor primero)</option>
                  </Selector>
                  <Boton variante="secundario" onClick={() => setEdicion(null)} disabled={!edicion}>
                    Deshacer cambios
                  </Boton>
                  <Boton onClick={() => setConfirmar(true)} disabled={!rotacionPermitida || movs.length === 0}>
                    Aplicar rotación del Día {dia}
                  </Boton>
                </div>
              </div>
            )
          }
        </Consulta>
      </Tarjeta>

      <Tarjeta titulo={`Se quedan fijos (${fijos.length})`}>
        {fijos.length === 0 ? (
          <p className="text-sm text-ink-3">Nadie por ahora.</p>
        ) : (
          <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {fijos.map((f) => (
              <li key={f.asignacion_id} className="flex items-baseline justify-between gap-2 border-b border-line py-1.5">
                <span className="font-semibold">{f.persona_nombre}</span>
                <span className="font-cond text-ink-3">
                  {f.comision_sigla ?? f.comision_clave} · {f.cargo_nombre}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <PesosDia key={`${dia}|${JSON.stringify(punt.data?.[0] ? [punt.data[0].peso_inicial, punt.data[0].peso_eyc] : [])}`} dia={dia} />

      <ReglasRotacion key={`${reglas.sinRotacion.join()}|${reglas.inicio}`} sinRotacion={reglas.sinRotacion} inicio={reglas.inicio} />

      <Modal
        abierto={confirmar}
        titulo={`Aplicar la rotación del Día ${dia}`}
        onCerrar={() => setConfirmar(false)}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setConfirmar(false)}>
              Cancelar
            </Boton>
            <Boton
              cargando={mover.isPending}
              onClick={() =>
                mover.mutate(
                  { movimientos: movs, motivo: 'rotacion', desde: inicioDelDia(fechaDia), nota: `Rotación del Día ${dia}` },
                  {
                    onSuccess: () => {
                      avisar(`Rotación del Día ${dia} registrada.`)
                      setConfirmar(false)
                      setEdicion(null)
                    },
                    onError: () => setConfirmar(false),
                  },
                )
              }
            >
              Confirmar
            </Boton>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          Se moverán <strong>{movs.length}</strong> miembros de mesa a partir del <strong>{fecha(fechaDia)}</strong>. Los aprendices, EyC y las comisiones que no rotan no cambian. Las
          asignaciones anteriores se cierran y quedan en el historial.
        </p>
      </Modal>
    </div>
  )
}

/** Regla de comisiones que no rotan y fecha del primer día de sesiones. */
function ReglasRotacion({ sinRotacion, inicio }: { sinRotacion: string[]; inicio: string }) {
  const comisiones = useComisiones()
  const guardar = useGuardarConfig()
  const avisar = useAvisar()
  const [sel, setSel] = useState<string[]>(sinRotacion)
  const [ini, setIni] = useState(inicio)
  const cambio = ini !== inicio || [...sel].sort().join() !== [...sinRotacion].sort().join()

  return (
    <Tarjeta titulo="Reglas de rotación">
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Primer día de sesiones (Día 1)" type="date" value={ini} onChange={(e) => setIni(e.target.value)} ayuda="El Día 2 y el Día 3 se calculan a partir de esta fecha." />
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Comisiones que no rotan</legend>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {comisiones.data?.map((c) => (
              <label key={c.id} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={sel.includes(c.clave)}
                  onChange={(e) => setSel(e.target.checked ? [...sel, c.clave] : sel.filter((x) => x !== c.clave))}
                />
                {siglaDe(c)}
              </label>
            ))}
          </div>
        </fieldset>
        {guardar.isError && <Aviso tono="peligro">{mensajeError(guardar.error)}</Aviso>}
        <div>
          <Boton
            disabled={!cambio || !ini}
            cargando={guardar.isPending}
            onClick={async () => {
              try {
                await guardar.mutateAsync({ clave: 'comisiones_sin_rotacion', valor: sel, descripcion: 'Comisiones cuya mesa no rota (claves).' })
                await guardar.mutateAsync({ clave: 'sesiones_inicio', valor: ini, descripcion: 'Fecha del Día 1 de sesiones; el Día 2 y el Día 3 rotan.' })
                avisar('Reglas de rotación guardadas.')
              } catch {
                /* el aviso del formulario muestra el error */
              }
            }}
          >
            Guardar reglas
          </Boton>
        </div>
      </div>
    </Tarjeta>
  )
}

/** Puntuación del día: total y de dónde sale. Lo que todavía no existe no cuenta como cero. */
function Puntuacion({ x }: { x: { inicial: number | null; eyc: number | null; total: number | null } | undefined }) {
  if (!x || x.total == null) return <span className="text-sm text-ink-3">Sin datos</span>
  const partes = [
    ['Inicial', x.inicial],
    ['EyC', x.eyc],
  ].filter(([, v]) => v != null) as [string, number][]
  return (
    <div>
      <p className="font-cond text-xl font-extrabold tabular leading-tight">{puntaje(x.total)}</p>
      <p className="font-cond text-xs text-ink-3">{partes.map(([k, v]) => `${k} ${puntaje(v)}`).join(' · ')}</p>
    </div>
  )
}

/** Pesos de cada fuente para la rotación del día elegido (suman 100). */
function PesosDia({ dia }: { dia: number }) {
  const config = useConfig()
  const guardar = useGuardarConfig()
  const avisar = useAvisar()
  const todos = (config.data?.ponderacion_rotacion?.valor ?? {}) as Record<string, Record<string, number>>
  const v = todos[String(dia)] ?? {}
  const [w, setW] = useState({ inicial: String(v.inicial ?? 0), eyc: String(v.eyc ?? 0) })
  const suma = Number(w.inicial) + Number(w.eyc)
  const campo = (k: keyof typeof w, etiqueta: string, ayuda: string) => (
    <Campo etiqueta={etiqueta} type="number" min={0} max={100} value={w[k]} onChange={(e) => setW({ ...w, [k]: e.target.value })} ayuda={ayuda} />
  )
  return (
    <Tarjeta titulo={`Pesos de la puntuación · Día ${dia}`}>
      <p className="mb-3 text-sm text-ink-2">
        Cuánto pesa cada fuente al decidir esta rotación. Conforme avanzan las sesiones, la calificación inicial pesa menos y lo observado pesa más. Si una fuente todavía no tiene datos de una
        persona, no cuenta como cero: el resto se reescala.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {campo('inicial', 'Calificación inicial (%)', 'Examen, institucional y pares.')}
        {campo('eyc', 'Valoración de EyC (%)', 'La rúbrica de las jornadas anteriores.')}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p role="status" className={`font-cond font-semibold ${suma === 100 ? 'text-verde' : 'text-danger'}`}>
          Suma: {suma} {suma === 100 ? '✓' : '— debe ser 100'}
        </p>
        <Boton
          disabled={suma !== 100}
          cargando={guardar.isPending}
          onClick={() =>
            guardar.mutate(
              {
                clave: 'ponderacion_rotacion',
                valor: { ...todos, [String(dia)]: { inicial: Number(w.inicial), eyc: Number(w.eyc) } },
                descripcion: 'Pesos de la calificación inicial y de la valoración de EyC para decidir la rotación del Día 2 y del Día 3 (cada día suma 100).',
              },
              { onSuccess: () => avisar('Pesos guardados.'), onError: (e) => avisar(mensajeError(e), 'error') },
            )
          }
        >
          Guardar pesos
        </Boton>
      </div>
    </Tarjeta>
  )
}
