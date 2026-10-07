import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { SiFaseAbierta } from '@/app/guards'
import { useMomento } from '@/app/fase'
import { AvisoCambios } from '@/components/AvisoCambios'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { AreaTexto } from '@/components/Campo'
import { Cargando, EstadoError } from '@/components/Estados'
import { Aviso, Insignia } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { useActividad } from '@/features/actividades/api'
import { useCriterios, useDimensiones } from '@/features/configuracion/api'
import { usePersona } from '@/features/personas/api'
import { mensajeError } from '@/lib/errores'
import { fecha as fmtFecha, puntaje } from '@/lib/formato'
import type { Criterio, Fase } from '@/lib/tipos'
import { buscarExistente, obtenerFaltantes, useEvaluacion, useGuardarEvaluacion } from './api'
import { DimensionAcordeon, type Respuestas } from './FormularioRubrica'
import { esDesfavorable } from './reglas'

/** /evaluar?persona=…&actividad=…  |  /evaluar?persona=…&fecha=…  →  crea o retoma la evaluación. */
export function NuevaEvaluacionPage() {
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const persona = sp.get('persona') ?? undefined
  const actividad = sp.get('actividad') ?? undefined
  const fecha = sp.get('fecha') ?? undefined
  const [error, setError] = useState<unknown>(null)
  const [revisado, setRevisado] = useState(false)

  useEffect(() => {
    if (!persona || (!actividad && !fecha)) return
    let vivo = true
    buscarExistente(persona, { actividadId: actividad, fecha })
      .then((id) => {
        if (!vivo) return
        if (id) nav(`/evaluaciones/${id}`, { replace: true })
        else setRevisado(true)
      })
      .catch((e) => vivo && setError(e))
    return () => {
      vivo = false
    }
  }, [persona, actividad, fecha, nav])

  if (!persona || (!actividad && !fecha)) return <Aviso tono="peligro">Falta indicar la persona y la actividad o jornada.</Aviso>
  if (error) return <EstadoError error={error} />
  if (!revisado) return <Cargando />
  return <Evaluar personaId={persona} actividadId={actividad} fechaJornada={fecha} />
}

export function EvaluacionPage() {
  const { id } = useParams()
  const q = useEvaluacion(id)
  if (q.isPending) return <Cargando />
  if (q.isError) return <EstadoError error={q.error} onReintentar={() => q.refetch()} />
  const c = q.data.cabecera
  return <Evaluar key={id} evaluacionId={id} personaId={c.persona_id!} actividadId={c.actividad_id ?? undefined} fechaJornada={c.fecha_jornada ?? undefined} />
}

function Evaluar({
  evaluacionId,
  personaId,
  actividadId,
  fechaJornada,
}: {
  evaluacionId?: string
  personaId: string
  actividadId?: string
  fechaJornada?: string
}) {
  const { perfil } = useSesion()
  const momento = useMomento()
  const persona = usePersona(personaId)
  const actividad = useActividad(actividadId)
  const dims = useDimensiones()
  const ambito = persona.data?.ambito
  const criterios = useCriterios(ambito)
  const existente = useEvaluacion(evaluacionId)

  if (persona.isPending || dims.isPending || criterios.isPending || (actividadId && actividad.isPending) || (evaluacionId && existente.isPending) || momento.cargando)
    return <Cargando filas={5} />
  const err = persona.error ?? dims.error ?? criterios.error ?? actividad.error ?? existente.error
  if (err) return <EstadoError error={err} />
  if (!persona.data) return <Aviso tono="peligro">No tienes acceso a esta persona o no existe.</Aviso>

  // Fase de la evaluación: la de la actividad, o la jornada del evento que contiene la fecha.
  const fase: Fase | undefined = actividad.data
    ? momento.fases.find((f) => f.id === actividad.data.fase_id)
    : existente.data
      ? momento.fases.find((f) => f.id === existente.data.cabecera.fase_id)
      : momento.fases.find((f) => f.es_evento && f.tipo === 'evaluacion' && f.inicio && f.fin && fechaJornada! >= f.inicio && fechaJornada! <= f.fin)

  const cab = existente.data?.cabecera
  const ajena = !!cab && cab.evaluador_id !== perfil?.id && perfil?.rol !== 'admin'
  const contexto = actividad.data ? actividad.data.nombre : `Jornada del ${fmtFecha(fechaJornada ?? null)}`

  const formulario = (soloLectura: boolean) => (
    <Formulario
      evaluacionId={evaluacionId}
      personaId={personaId}
      actividadId={actividadId}
      fechaJornada={fechaJornada}
      criteriosActivos={criterios.data!.filter((c) => c.activo)}
      dimensiones={dims.data!}
      existente={existente.data}
      soloLectura={soloLectura}
    />
  )

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-2 text-sm">
        <Link to={perfil?.rol === 'eyc' ? '/comision' : '/monitoreo'} className="font-bold text-acento">
          ← Volver
        </Link>
      </nav>
      <header className="mb-4">
        <p className="sobretitulo text-acento">Evaluar · {contexto}</p>
        <h1 className="text-[clamp(1.8rem,6vw,2.6rem)] font-black leading-tight tracking-tight">
          <Link to={`/personas/${personaId}`} className="hover:underline">
            {persona.data.nombre}
          </Link>
        </h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {cab?.cargo_nombre && <Insignia>{cab.cargo_nombre}</Insignia>}
          {cab?.comision_sigla && <Insignia>{cab.comision_sigla}</Insignia>}
          {fase && <Insignia tono="acento">{fase.nombre}</Insignia>}
          {cab && <Insignia tono={cab.estado === 'completa' ? 'exito' : 'alerta'}>{cab.estado === 'completa' ? 'Completa' : 'Borrador'}</Insignia>}
          {cab?.estado === 'completa' && cab.puntaje != null && <Insignia tono="acento">Puntaje {puntaje(cab.puntaje)}</Insignia>}
        </div>
        {cab?.observacion_rotacion && (
          <div className="mt-3">
            <Aviso tono="info">{cab.observacion_rotacion}</Aviso>
          </div>
        )}
        {cab && cab.pesos_validos === false && (
          <div className="mt-3">
            <Aviso tono="alerta" titulo="Cálculo bloqueado">
              Los pesos de las dimensiones de este ámbito no suman 100; el puntaje no se calcula hasta que se corrijan.
            </Aviso>
          </div>
        )}
      </header>

      {ajena ? (
        <>
          <Aviso tono="info">Esta evaluación la registró {cab?.evaluador_nombre ?? 'otra persona'}; solo puede verla.</Aviso>
          <div className="mt-4">{formulario(true)}</div>
        </>
      ) : (
        <SiFaseAbierta fase={fase} soloLectura={evaluacionId ? formulario(true) : undefined}>
          {formulario(false)}
        </SiFaseAbierta>
      )}
    </div>
  )
}

function Formulario({
  evaluacionId,
  personaId,
  actividadId,
  fechaJornada,
  criteriosActivos,
  dimensiones,
  existente,
  soloLectura,
}: {
  evaluacionId?: string
  personaId: string
  actividadId?: string
  fechaJornada?: string
  criteriosActivos: Criterio[]
  dimensiones: { id: number; clave: string; nombre: string; competencias: string; orden: number }[]
  existente: ReturnType<typeof useEvaluacion>['data']
  soloLectura: boolean
}) {
  const nav = useNavigate()
  const qc = useQueryClient()
  const avisar = useAvisar()
  const guardar = useGuardarEvaluacion()

  // Criterios a mostrar: los activos + los ya respondidos (con su texto y respuesta favorable de ese momento).
  const criterios = useMemo(() => {
    const porId = new Map(criteriosActivos.map((c) => [c.id, c]))
    for (const r of existente?.respuestas ?? []) {
      const base = porId.get(r.criterio_id)
      porId.set(r.criterio_id, {
        ...(base ?? ({ id: r.criterio_id, codigo: '·', orden: 99, ambito: 'mesa', activo: false } as Criterio)),
        dimension_id: r.dimension_id,
        texto: r.texto,
        favorable: r.favorable,
      })
    }
    return [...porId.values()].sort((a, b) => a.dimension_id - b.dimension_id || a.orden - b.orden)
  }, [criteriosActivos, existente])

  const inicial = useMemo(() => {
    const resp: Respuestas = {}
    for (const r of existente?.respuestas ?? []) resp[r.criterio_id] = { respuesta: r.respuesta, comentario: r.comentario ?? '' }
    const noObs = new Set((existente?.dimensiones ?? []).filter((d) => d.no_observado).map((d) => d.dimension_id))
    return { resp, noObs, comentario: existente?.cabecera.comentario_general ?? '' }
  }, [existente])

  const [respuestas, setRespuestas] = useState<Respuestas>(inicial.resp)
  const [noObs, setNoObs] = useState<Set<number>>(inicial.noObs)
  const [comentario, setComentario] = useState(inicial.comentario)
  const [sucio, setSucio] = useState(false)
  const [abiertas, setAbiertas] = useState<Set<number>>(() => {
    const primera = dimensiones.find((d) => criterios.some((c) => c.dimension_id === d.id && !inicial.resp[c.id]?.respuesta) && !inicial.noObs.has(d.id))
    return new Set(primera ? [primera.id] : [])
  })
  const [intentoCompletar, setIntentoCompletar] = useState(false)

  const faltantes = existente?.faltantes ?? []
  const codigoAId = new Map(criterios.filter((c) => c.activo || existente).map((c) => [c.codigo, c.id]))
  const marcas: Record<number, string> = {}
  if (intentoCompletar || existente?.cabecera.estado === 'borrador') {
    for (const f of faltantes) {
      const dim = dimensiones.find((d) => d.clave === f.dimension)
      const id = criterios.find((c) => c.codigo === f.criterio && c.dimension_id === dim?.id)?.id ?? codigoAId.get(f.criterio ?? '')
      if (id && !sucio) marcas[id] = f.motivo
    }
  }

  // Progreso (conteo de interfaz; la validación real la hace la base).
  const requeridos = criterios.filter((c) => c.activo && !noObs.has(c.dimension_id))
  const respondidos = requeridos.filter((c) => respuestas[c.id]?.respuesta).length
  const sinComentario = criterios.filter((c) => !noObs.has(c.dimension_id) && esDesfavorable(c, respuestas[c.id]?.respuesta) && !respuestas[c.id]?.comentario.trim())
  const pct = requeridos.length ? Math.round((respondidos / requeridos.length) * 100) : 100

  const carga = (estado: 'borrador' | 'completa') => ({
    id: evaluacionId,
    persona_id: personaId,
    actividad_id: actividadId,
    fecha_jornada: fechaJornada,
    comentario_general: comentario.trim() || undefined,
    estado,
    respuestas: Object.entries(respuestas)
      .filter(([, v]) => v.respuesta)
      .map(([id, v]) => ({ criterio_id: Number(id), respuesta: v.respuesta!, comentario: v.comentario.trim() })),
    dimensiones_no_observadas: [...noObs],
  })

  const trasGuardar = (id: string) => {
    setSucio(false)
    if (!evaluacionId) nav(`/evaluaciones/${id}`, { replace: true, state: { guardado: true } })
  }

  const guardarBorrador = () =>
    guardar.mutate(carga('borrador'), {
      onSuccess: (id) => {
        avisar('Borrador guardado.')
        trasGuardar(id)
      },
      onError: (e) => avisar(mensajeError(e), 'error'),
    })

  // Completar: primero se persiste como borrador (nada se pierde) y la base dice qué falta.
  const completar = () => {
    setIntentoCompletar(true)
    guardar.mutate(carga('borrador'), {
      onSuccess: async (id) => {
        const lista = await obtenerFaltantes(id)
        if (lista.length) {
          setSucio(false)
          await qc.invalidateQueries({ queryKey: ['evaluaciones', 'detalle', id] })
          const dimsConFalta = new Set(dimensiones.filter((d) => lista.some((f) => f.dimension === d.clave)).map((d) => d.id))
          setAbiertas((a) => new Set([...a, ...dimsConFalta]))
          avisar(`No se puede completar: ${lista.length === 1 ? 'falta 1 punto' : `faltan ${lista.length} puntos`}.`, 'error')
          if (!evaluacionId) trasGuardar(id)
          return
        }
        guardar.mutate(
          { ...carga('completa'), id },
          {
            onSuccess: () => {
              avisar('Evaluación completa.')
              trasGuardar(id)
            },
            onError: (e) => avisar(mensajeError(e), 'error'),
          },
        )
      },
      onError: (e) => avisar(mensajeError(e), 'error'),
    })
  }

  const puntosPorDim = new Map((existente?.puntos ?? []).map((p) => [p.dimension_id!, p]))
  const esCompleta = existente?.cabecera.estado === 'completa'

  const progreso = (
    <div>
      <div className="flex items-center justify-between font-cond text-sm font-semibold">
        <span>
          {respondidos} de {requeridos.length} criterios
        </span>
        <span className={sinComentario.length ? 'text-danger' : 'text-ink-3'}>
          {sinComentario.length ? `${sinComentario.length} comentario(s) pendiente(s)` : `${pct}%`}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progreso de la evaluación">
        <div className="h-full rounded-full bg-grad-celeste transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        completar()
      }}
      className="flex flex-col gap-3"
      noValidate
    >
      {!soloLectura && <AvisoCambios sucio={sucio} />}

      {soloLectura && progreso}

      {faltantes.length > 0 && !sucio && (intentoCompletar || existente?.cabecera.estado === 'borrador') && (
        <Aviso tono={intentoCompletar ? 'peligro' : 'alerta'} titulo="Lo que falta para marcarla completa">
          <ul className="mt-1 list-disc pl-5">
            {faltantes.map((f, i) => {
              const dim = dimensiones.find((d) => d.clave === f.dimension)
              const crit = criterios.find((c) => c.codigo === f.criterio && c.dimension_id === dim?.id)
              return (
                <li key={i}>
                  {crit ? (
                    <a
                      href={`#criterio-${crit.id}`}
                      onClick={() => setAbiertas((a) => new Set([...a, crit.dimension_id]))}
                      className="font-semibold underline"
                    >
                      {f.dimension}·{f.criterio}
                    </a>
                  ) : (
                    f.dimension && <strong>{f.dimension}</strong>
                  )}{' '}
                  {f.motivo}
                </li>
              )
            })}
          </ul>
        </Aviso>
      )}

      {dimensiones.map((d) => {
        const cs = criterios.filter((c) => c.dimension_id === d.id)
        if (!cs.length) return null
        return (
          <DimensionAcordeon
            key={d.id}
            dimension={d}
            criterios={cs}
            respuestas={respuestas}
            noObservada={noObs.has(d.id)}
            puntos={puntosPorDim.get(d.id)}
            abierta={abiertas.has(d.id)}
            onAlternar={() =>
              setAbiertas((a) => {
                const n = new Set(a)
                if (n.has(d.id)) n.delete(d.id)
                else n.add(d.id)
                return n
              })
            }
            onRespuesta={(id, v) => {
              setRespuestas((r) => ({ ...r, [id]: v }))
              setSucio(true)
            }}
            onNoObservada={(v) => {
              setNoObs((s) => {
                const n = new Set(s)
                if (v) n.add(d.id)
                else n.delete(d.id)
                return n
              })
              setSucio(true)
            }}
            soloLectura={soloLectura}
            marcas={marcas}
          />
        )
      })}

      <AreaTexto
        etiqueta="Comentario general (opcional)"
        value={comentario}
        disabled={soloLectura}
        onChange={(e) => {
          setComentario(e.target.value)
          setSucio(true)
        }}
      />

      {!soloLectura && (
        <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 -mx-4 mt-2 flex flex-col gap-2 border-t border-line bg-surface/95 px-4 pb-3 pt-3 shadow-card backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border lg:bottom-4 dark:bg-[#0b1a6b]/95">
          {progreso}
          <div className="flex gap-2">
          {!esCompleta && (
            <Boton variante="secundario" className="flex-1" onClick={guardarBorrador} cargando={guardar.isPending && !intentoCompletar} disabled={guardar.isPending}>
              Guardar borrador
            </Boton>
          )}
          <Boton type="submit" className="flex-1" cargando={guardar.isPending && intentoCompletar} disabled={guardar.isPending}>
            {esCompleta ? 'Guardar cambios' : 'Marcar completa'}
          </Boton>
          </div>
        </div>
      )}
    </form>
  )
}
