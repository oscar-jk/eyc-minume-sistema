import { useState } from 'react'
import { useMomento } from '@/app/fase'
import { SiFaseAbierta } from '@/app/guards'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { Campo, Selector } from '@/components/Campo'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Aviso, Insignia, Tarjeta } from '@/components/Ui'
import { mensajeError } from '@/lib/errores'
import { TIPO_ACTIVIDAD, fecha } from '@/lib/formato'
import type { Actividad, Ambito, TipoActividad } from '@/lib/tipos'
import { useActividades, useCerrarActividad, useCrearActividad } from './api'
import { EditarActividad } from './EditarActividad'

/** Actividades previas al evento (taller, capacitación, reunión): crear, cerrar y reabrir. */
export function ActividadesPanel({ comisionId, ambito = 'mesa' }: { comisionId: number | null; ambito?: Ambito }) {
  const m = useMomento()
  const avisar = useAvisar()
  const q = useActividades({ comisionId: comisionId ?? undefined, ambito })
  const crear = useCrearActividad()
  const cerrar = useCerrarActividad()
  const fasePrevia = m.abiertas.find((f) => f.tipo === 'evaluacion' && !f.es_evento) ?? m.fases.find((f) => f.tipo === 'evaluacion' && !f.es_evento)
  const [editar, setEditar] = useState<Actividad | null>(null)
  const [form, setForm] = useState({ nombre: '', tipo: 'taller' as TipoActividad, fecha: m.hoy ?? '' })

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta titulo="Nueva actividad">
        <SiFaseAbierta fase={fasePrevia}>
          <form
            className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              crear.mutate(
                { fase_id: fasePrevia!.id, comision_id: comisionId, ambito, tipo: form.tipo, nombre: form.nombre.trim(), fecha: form.fecha },
                {
                  onSuccess: () => {
                    avisar('Actividad creada.')
                    setForm({ ...form, nombre: '' })
                  },
                },
              )
            }}
          >
            <Campo etiqueta="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} requerido placeholder="Ej.: Segunda capacitación" />
            <Selector etiqueta="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoActividad })}>
              {Object.entries(TIPO_ACTIVIDAD).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </Selector>
            <Campo etiqueta="Fecha" type="date" value={form.fecha} max={m.hoy ?? undefined} onChange={(e) => setForm({ ...form, fecha: e.target.value })} requerido />
            <Boton type="submit" cargando={crear.isPending} disabled={form.nombre.trim().length < 2 || !form.fecha}>
              Crear
            </Boton>
            {crear.isError && (
              <div className="sm:col-span-4">
                <Aviso tono="peligro">{mensajeError(crear.error)}</Aviso>
              </div>
            )}
          </form>
        </SiFaseAbierta>
      </Tarjeta>

      <Tarjeta titulo="Actividades">
        <Consulta q={q} vacio={<EstadoVacio titulo="Todavía no hay actividades" />}>
          {(acts) => (
            <ul className="flex flex-col gap-2">
              {acts.map((a) => {
                const editable = a.fase?.estado === 'abierta' && (a.comision_id === comisionId || comisionId === null)
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-accent hover:shadow-card dark:bg-white/[0.04]">
                    <div className="min-w-0 flex-1 basis-[13rem]">
                      <p className="font-semibold">{a.nombre}</p>
                      <p className="font-cond text-sm text-ink-3">
                        {TIPO_ACTIVIDAD[a.tipo]} · {fecha(a.fecha)} · {a.fase?.nombre}
                        {a.comision_id === null && ' · general'}
                      </p>
                    </div>
                    {a.cerrada ? <Insignia>Cerrada</Insignia> : <Insignia tono="exito">Abierta</Insignia>}
                    {editable && (
                      <Boton variante="fantasma" onClick={() => setEditar(a)}>
                        Editar
                      </Boton>
                    )}
                    {editable && (
                      <Boton
                        variante="secundario"
                        cargando={cerrar.isPending && cerrar.variables?.id === a.id}
                        onClick={() =>
                          cerrar.mutate(
                            { id: a.id, cerrada: !a.cerrada },
                            { onSuccess: () => avisar(a.cerrada ? 'Actividad reabierta.' : 'Actividad cerrada.'), onError: (e) => avisar(mensajeError(e), 'error') },
                          )
                        }
                      >
                        {a.cerrada ? 'Reabrir' : 'Cerrar'}
                      </Boton>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Consulta>
      </Tarjeta>
      {editar && <EditarActividad key={editar.id} actividad={editar} max={m.hoy ?? undefined} onCerrar={() => setEditar(null)} />}
    </div>
  )
}
