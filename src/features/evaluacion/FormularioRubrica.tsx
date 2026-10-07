import { useId, useState } from 'react'
import { puntaje } from '@/lib/formato'
import type { Criterio, Dimension, Respuesta } from '@/lib/tipos'
import { esDesfavorable } from './reglas'

export interface EstadoRespuesta {
  respuesta?: Respuesta
  comentario: string
}

export type Respuestas = Record<number, EstadoRespuesta>

const OPCIONES: { valor: Respuesta; texto: string; lector: string }[] = [
  { valor: 'si', texto: 'Sí', lector: 'Sí' },
  { valor: 'no', texto: 'No', lector: 'No' },
  { valor: 'no_observado', texto: 'N/O', lector: 'No observado' },
]

function ControlCriterio({
  criterio,
  valor,
  onCambio,
  soloLectura,
  marcado,
}: {
  criterio: Criterio
  valor: EstadoRespuesta
  onCambio: (v: EstadoRespuesta) => void
  soloLectura: boolean
  marcado?: string
}) {
  const nombre = useId()
  const idComentario = useId()
  const exigeComentario = esDesfavorable(criterio, valor.respuesta)
  const faltaComentario = exigeComentario && !valor.comentario.trim()

  return (
    <fieldset
      id={`criterio-${criterio.id}`}
      className={`scroll-mt-40 rounded-2xl border p-4 ${marcado ? 'border-danger bg-danger-soft' : 'border-line'}`}
      aria-describedby={marcado ? `${nombre}-marca` : undefined}
      disabled={soloLectura}
    >
      <legend className="sr-only">
        {criterio.codigo}. {criterio.texto}
      </legend>
      <p aria-hidden className="mb-2 font-medium leading-snug text-ink">
        <span className="mr-1.5 font-cond font-bold text-acento">{criterio.codigo}</span>
        {criterio.texto}
      </p>
      {criterio.favorable === 'no' && (
        <p className="mb-2 font-cond text-sm font-semibold text-ink-3">Redactado en negativo: lo esperado es «No».</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {OPCIONES.map((o) => {
          const activo = valor.respuesta === o.valor
          const malo = activo && esDesfavorable(criterio, o.valor)
          return (
            <label key={o.valor} className="relative">
              <input
                type="radio"
                name={nombre}
                value={o.valor}
                checked={activo}
                onChange={() => onCambio({ ...valor, respuesta: o.valor })}
                className="peer sr-only"
                aria-label={`${o.lector}${criterio.favorable === o.valor ? ' (respuesta esperada)' : ''}`}
              />
              <span
                aria-hidden
                className={`flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 font-cond text-lg font-bold transition-colors peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] peer-disabled:cursor-default ${
                  activo
                    ? malo
                      ? 'border-transparent bg-grad-rosa text-white shadow-[0_8px_20px_-8px_rgb(229_53_53/0.6)]'
                      : o.valor === 'no_observado'
                        ? 'border-gris bg-gris-bg text-gris'
                        : 'border-transparent bg-grad-primario text-white shadow-boton'
                    : 'border-line bg-surface-2 text-ink-2 hover:border-accent dark:bg-white/[0.05]'
                }`}
              >
                {o.texto}
              </span>
            </label>
          )
        })}
      </div>
      {(exigeComentario || valor.comentario) && (
        <div className="mt-3 flex flex-col gap-1">
          <label htmlFor={idComentario} className="text-sm font-semibold">
            Comentario{exigeComentario && <span className="text-danger"> * obligatorio: la respuesta es desfavorable</span>}
          </label>
          <textarea
            id={idComentario}
            rows={2}
            value={valor.comentario}
            onChange={(e) => onCambio({ ...valor, comentario: e.target.value })}
            aria-required={exigeComentario}
            aria-invalid={faltaComentario || undefined}
            placeholder="Describe lo observado"
            className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-base aria-[invalid=true]:border-danger"
          />
        </div>
      )}
      {!exigeComentario && !valor.comentario && valor.respuesta && !soloLectura && (
        <button
          type="button"
          className="mt-2 min-h-9 text-sm font-bold text-acento"
          onClick={() => onCambio({ ...valor, comentario: ' ' })}
        >
          + Agregar comentario
        </button>
      )}
      {marcado && (
        <p id={`${nombre}-marca`} className="mt-2 text-sm font-semibold text-danger">
          {marcado}
        </p>
      )}
    </fieldset>
  )
}

export function DimensionAcordeon({
  dimension,
  criterios,
  respuestas,
  noObservada,
  puntos,
  abierta,
  onAlternar,
  onRespuesta,
  onNoObservada,
  soloLectura,
  marcas,
}: {
  dimension: Dimension
  criterios: Criterio[]
  respuestas: Respuestas
  noObservada: boolean
  puntos: { puntos: number | null; observada: boolean | null } | undefined
  abierta: boolean
  onAlternar: () => void
  onRespuesta: (id: number, v: EstadoRespuesta) => void
  onNoObservada: (v: boolean) => void
  soloLectura: boolean
  marcas: Record<number, string>
}) {
  const idPanel = useId()
  const respondidos = criterios.filter((c) => respuestas[c.id]?.respuesta).length
  const pendientesComentario = criterios.filter((c) => esDesfavorable(c, respuestas[c.id]?.respuesta) && !respuestas[c.id]?.comentario.trim()).length
  const completa = noObservada || (respondidos === criterios.length && pendientesComentario === 0)
  const conMarcas = criterios.some((c) => marcas[c.id])
  const [verCompetencias, setVer] = useState(false)

  let estado: { texto: string; clase: string }
  if (noObservada) estado = { texto: 'No observada', clase: 'bg-gris-bg text-gris' }
  else if (completa) estado = { texto: 'Completa', clase: 'bg-verde-bg text-verde' }
  else estado = { texto: `${respondidos}/${criterios.length}${pendientesComentario ? ` · falta comentario` : ''}`, clase: 'bg-amarillo-bg text-amarillo' }

  return (
    <section className={`overflow-hidden rounded-3xl border bg-surface shadow-card dark:bg-vidrio ${conMarcas ? 'border-danger' : 'border-line'}`}>
      <h3>
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={idPanel}
          onClick={onAlternar}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-grad-primario font-cond text-xl font-extrabold text-white shadow-boton">
            {dimension.clave}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[1.05rem] font-extrabold leading-tight">{dimension.nombre}</span>
            <span className="font-cond text-sm text-ink-3">
              {puntos?.observada ? `Puntos guardados: ${puntaje(puntos.puntos)}` : puntos ? 'Sin puntos guardados' : 'Aún sin guardar'}
            </span>
          </span>
          <span className={`shrink-0 rounded-md px-2 py-0.5 font-cond text-sm font-semibold ${estado.clase}`}>{estado.texto}</span>
          <span aria-hidden className={`shrink-0 text-ink-3 transition-transform ${abierta ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
      </h3>
      <div id={idPanel} hidden={!abierta} className="flex flex-col gap-3 border-t border-line px-4 py-4">
        <button type="button" onClick={() => setVer((v) => !v)} className="self-start text-sm font-bold text-acento" aria-expanded={verCompetencias}>
          {verCompetencias ? 'Ocultar competencias' : 'Ver competencias que mide'}
        </button>
        {verCompetencias && <p className="text-sm text-ink-2">{dimension.competencias}</p>}
        <label className="flex min-h-11 items-center gap-3 rounded-lg bg-surface-2 px-3">
          <input
            type="checkbox"
            checked={noObservada}
            disabled={soloLectura}
            onChange={(e) => onNoObservada(e.target.checked)}
            className="size-5 accent-[var(--accent)]"
          />
          <span className="text-sm">
            <span className="font-semibold">Dimensión no observada</span> — se excluye del cálculo (no cuenta como cero).
          </span>
        </label>
        {!noObservada &&
          criterios.map((c) => (
            <ControlCriterio
              key={c.id}
              criterio={c}
              valor={respuestas[c.id] ?? { comentario: '' }}
              onCambio={(v) => onRespuesta(c.id, v)}
              soloLectura={soloLectura}
              marcado={marcas[c.id]}
            />
          ))}
      </div>
    </section>
  )
}
