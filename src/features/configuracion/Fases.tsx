import { useState } from 'react'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { Campo, Selector } from '@/components/Campo'
import { Consulta } from '@/components/Estados'
import { Modal } from '@/components/Modal'
import { Aviso, Insignia, Tarjeta } from '@/components/Ui'
import { mensajeError } from '@/lib/errores'
import { ESTADO_FASE, fecha } from '@/lib/formato'
import type { EstadoFase, Fase } from '@/lib/tipos'
import { SESIONES_DIAS_POR_DEFECTO, SESIONES_INICIO_POR_DEFECTO } from '@/features/asignaciones/rotacion'
import { useActualizarConfig, useActualizarFase, useConfig, useCortes, useFases, useGuardarConfig, useReprogramarEvento } from './api'

export function FasesPanel() {
  const fases = useFases()
  const cortes = useCortes()
  const actualizar = useActualizarFase()
  const avisar = useAvisar()
  const [cambio, setCambio] = useState<{ fase: Fase; estado: EstadoFase } | null>(null)
  const [fechas, setFechas] = useState<Record<number, { inicio: string; fin: string }>>({})

  const aplicar = (fase: Fase, estado: EstadoFase) =>
    actualizar.mutate(
      { id: fase.id, estado },
      { onSuccess: () => avisar(`${fase.nombre}: ${ESTADO_FASE[estado].toLowerCase()}.`), onError: (e) => avisar(mensajeError(e), 'error') },
    )

  return (
    <div className="flex flex-col gap-5">
      <EventoPanel />
      <Tarjeta titulo="Fases">
        <p className="mb-3 text-sm text-ink-2">Una fase cerrada bloquea toda escritura de ese período en la base de datos, para cualquier rol.</p>
        <Consulta q={fases}>
          {(fs) => (
            <ul className="flex flex-col gap-3">
              {fs.map((f) => {
                const fe = fechas[f.id] ?? { inicio: f.inicio ?? '', fin: f.fin ?? '' }
                const sucio = fe.inicio !== (f.inicio ?? '') || fe.fin !== (f.fin ?? '')
                return (
                  <li key={f.id} className="rounded-2xl border border-line bg-surface p-4 dark:bg-white/[0.04]">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="flex-1 font-semibold">{f.nombre}</p>
                      <Insignia tono={f.estado === 'abierta' ? 'exito' : f.estado === 'cerrada' ? 'peligro' : 'neutro'}>{ESTADO_FASE[f.estado]}</Insignia>
                      <Insignia>{f.tipo === 'evaluacion' ? (f.es_evento ? 'Evaluación por jornada' : 'Evaluación por actividad') : 'Recomendación'}</Insignia>
                      <Insignia>{cortes.data?.find((c) => c.id === f.corte_id)?.nombre}</Insignia>
                      {f.permite_rotacion && <Insignia tono="acento">Permite rotación</Insignia>}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_1fr] sm:items-end">
                      <Campo etiqueta="Inicio" type="date" value={fe.inicio} onChange={(e) => setFechas({ ...fechas, [f.id]: { ...fe, inicio: e.target.value } })} />
                      <Campo etiqueta="Fin" type="date" value={fe.fin} onChange={(e) => setFechas({ ...fechas, [f.id]: { ...fe, fin: e.target.value } })} />
                      <Boton
                        variante="secundario"
                        disabled={!sucio}
                        onClick={() =>
                          actualizar.mutate(
                            { id: f.id, inicio: fe.inicio || null, fin: fe.fin || null },
                            { onSuccess: () => avisar('Fechas guardadas.'), onError: (e) => avisar(mensajeError(e), 'error') },
                          )
                        }
                      >
                        Guardar fechas
                      </Boton>
                      <Selector
                        etiqueta="Estado"
                        value={f.estado}
                        onChange={(e) => {
                          const estado = e.target.value as EstadoFase
                          if (estado === 'cerrada' || f.estado === 'cerrada') setCambio({ fase: f, estado })
                          else aplicar(f, estado)
                        }}
                      >
                        {(['pendiente', 'abierta', 'cerrada'] as EstadoFase[]).map((s) => (
                          <option key={s} value={s}>
                            {ESTADO_FASE[s]}
                          </option>
                        ))}
                      </Selector>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Consulta>
      </Tarjeta>
      <Modal
        abierto={!!cambio}
        titulo={cambio?.estado === 'cerrada' ? `¿Cerrar «${cambio?.fase.nombre}»?` : `¿Reabrir «${cambio?.fase.nombre}»?`}
        onCerrar={() => setCambio(null)}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setCambio(null)}>
              Cancelar
            </Boton>
            <Boton
              variante={cambio?.estado === 'cerrada' ? 'peligro' : 'primario'}
              onClick={() => {
                if (cambio) aplicar(cambio.fase, cambio.estado)
                setCambio(null)
              }}
            >
              Confirmar
            </Boton>
          </>
        }
      >
        <p>
          {cambio?.estado === 'cerrada'
            ? 'Nadie podrá crear ni modificar evaluaciones, actividades, recomendaciones ni decisiones de este período. Los borradores que queden sin completar no cuentan para el promedio.'
            : 'Se volverá a permitir escribir en este período. El cambio queda registrado en la auditoría.'}
        </p>
      </Modal>
    </div>
  )
}

function EventoPanel() {
  const config = useConfig()
  const reprogramar = useReprogramarEvento()
  const actualizar = useActualizarConfig()
  const avisar = useAvisar()
  const inicio = (config.data?.evento_inicio?.valor as string | undefined) ?? ''
  const dias = Number(config.data?.evento_dias?.valor ?? 6)
  const sesionesInicio = typeof config.data?.sesiones_inicio?.valor === 'string' ? (config.data.sesiones_inicio.valor as string) : SESIONES_INICIO_POR_DEFECTO
  const sesionesDias = typeof config.data?.sesiones_dias?.valor === 'number' ? (config.data.sesiones_dias.valor as number) : SESIONES_DIAS_POR_DEFECTO
  const guardarConfig = useGuardarConfig()
  const [f, setF] = useState<{ inicio: string; dias: number; sesiones: string; sesionesDias: number } | null>(null)
  const v = f ?? { inicio, dias, sesiones: sesionesInicio, sesionesDias }
  const dia = (n: number) => {
    const d = new Date(`${v.sesiones || sesionesInicio}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + n)
    return d.toISOString().slice(0, 10)
  }
  const provisional = config.data?.evento_inicio?.provisional || config.data?.evento_dias?.provisional
  const metodo = (config.data?.metodo_promedio?.valor as string | undefined) ?? 'simple'

  return (
    <Tarjeta titulo="Evento">
      {provisional && (
        <div className="mb-3">
          <Aviso tono="alerta" titulo="Fechas por confirmar">
            El mes del evento no está confirmado y el instructivo habla de 5 días mientras el rango 14–19 son 6. Se sembraron 6 días a partir del {fecha(inicio)}.
          </Aviso>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta="Día 1 del evento" type="date" value={v.inicio} onChange={(e) => setF({ ...v, inicio: e.target.value })} />
        <Campo etiqueta="Días de evento" type="number" min={3} max={10} value={v.dias} onChange={(e) => setF({ ...v, dias: Number(e.target.value) })} />
        <Campo
          etiqueta="Primer día de sesiones"
          type="date"
          value={v.sesiones}
          onChange={(e) => setF({ ...v, sesiones: e.target.value })}
          ayuda="Los cortes cuentan desde este día."
        />
        <Campo
          etiqueta="Días de sesiones con rotación"
          type="number"
          min={1}
          max={10}
          value={v.sesionesDias}
          onChange={(e) => setF({ ...v, sesionesDias: Number(e.target.value) })}
          ayuda="El Día 1 es la comisión original; del Día 2 en adelante se rota."
        />
      </div>
      <div className="mt-3">
        <Boton
          disabled={!f || !v.inicio || !v.sesiones || v.dias < 3 || v.sesionesDias < 1}
          cargando={reprogramar.isPending || guardarConfig.isPending}
          onClick={async () => {
            try {
              await guardarConfig.mutateAsync({ clave: 'sesiones_inicio', valor: v.sesiones, descripcion: 'Fecha del Día 1 de sesiones de trabajo.' })
              await guardarConfig.mutateAsync({ clave: 'sesiones_dias', valor: v.sesionesDias, descripcion: 'Días de sesiones con rotación a partir del Día 2.' })
              await reprogramar.mutateAsync({ inicio: v.inicio, dias: v.dias })
              avisar('Calendario guardado: fechas de las fases actualizadas.')
              setF(null)
            } catch (e) {
              avisar(mensajeError(e), 'error')
            }
          }}
        >
          Guardar calendario
        </Boton>
      </div>
      <p className="mt-2 text-sm text-ink-3">
        Sesiones: Día 1 {fecha(dia(0), true)} · Día 2 {fecha(dia(1), true)} · Día 3 {fecha(dia(2), true)}. Días 1–2 → Corte 2; Día 3 en adelante → Evaluación Final; cierre el último día
        del evento. Las fechas de cada fase se pueden ajustar una por una abajo.
      </p>
      <div className="mt-4 max-w-md">
        <Selector
          etiqueta="Promedio por corte"
          value={metodo}
          onChange={(e) => actualizar.mutate({ clave: 'metodo_promedio', valor: e.target.value }, { onSuccess: () => avisar('Método de promedio actualizado.') })}
          ayuda="Simple: todas las evaluaciones completas pesan igual. Ponderado: cada evaluación pesa según los días asignados en el período."
        >
          <option value="simple">Promedio simple</option>
          <option value="ponderado_dias">Ponderado por días asignados</option>
        </Selector>
      </div>
    </Tarjeta>
  )
}
