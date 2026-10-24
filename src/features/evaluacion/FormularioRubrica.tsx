import { useId, useState } from 'react'
import { IcoAbajo } from '@/components/Iconos'
import { puntaje } from '@/lib/formato'
import type { Criterio, Dimension, Respuesta } from '@/lib/tipos'
import { esDeNota, esDesfavorable, exigeComentario } from './reglas'

export interface EstadoRespuesta {
  respuesta?: Respuesta
  comentario: string
  /** Solo en criterios de nota: de 0 hasta los puntos del criterio. */
  nota?: number
}

export type Respuestas = Record<number, EstadoRespuesta>

const OPCIONES: { valor: Respuesta; texto: string; lector: string }[] = [
  { valor: 'si', texto: 'Sí', lector: 'Sí' },
  { valor: 'no', texto: 'No', lector: 'No' },
  { valor: 'no_observado', texto: 'N/O', lector: 'No observado' },
]

const redondear = (n: number) => Math.round(n * 100) / 100
const fmt = (n: number) => n.toLocaleString('es-DO', { maximumFractionDigits: 2 })

function Descripcion({ id, valor, onCambio, obligatoria, falta, etiqueta, placeholder }: { id: string; valor: string; onCambio: (v: string) => void; obligatoria: boolean; falta: boolean; etiqueta: string; placeholder: string }) {
  return (
    <div className="mt-3 flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {etiqueta}
        {obligatoria && <span className="text-danger"> * obligatoria</span>}
      </label>
      <textarea
        id={id}
        rows={2}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        aria-required={obligatoria}
        aria-invalid={falta || undefined}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-base aria-[invalid=true]:border-danger"
      />
    </div>
  )
}

/** Criterio con nota: de 0 hasta sus puntos, o N/A. La descripción es obligatoria siempre, también en N/A. */
function ControlNota({
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
  const idComentario = useId()
  const max = Number(criterio.nota_max)
  const esNA = valor.respuesta === 'no_observado'
  const calificado = valor.respuesta === 'si' && valor.nota != null
  const falta = !!valor.respuesta && !valor.comentario.trim()
  const atajos = [0, 0.25, 0.5, 0.75, 1].map((f) => redondear(max * f))

  const poner = (n: number | undefined) =>
    onCambio({ ...valor, respuesta: n == null ? undefined : 'si', nota: n == null ? undefined : Math.min(max, Math.max(0, redondear(n))) })

  return (
    <fieldset
      id={`criterio-${criterio.id}`}
      className={`scroll-mt-40 rounded-2xl border p-4 ${marcado ? 'border-danger bg-danger-soft' : 'border-line'}`}
      disabled={soloLectura}
    >
      <legend className="sr-only">
        {criterio.codigo}. {criterio.texto}
      </legend>
      <p aria-hidden className="mb-3 font-medium leading-snug text-ink">
        {criterio.texto}
      </p>

      {!esNA && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Nota (de 0 a {fmt(max)})</span>
            <span className="flex items-baseline gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={max}
                step="0.5"
                value={valor.nota ?? ''}
                disabled={soloLectura}
                onChange={(e) => poner(e.target.value === '' ? undefined : Number(e.target.value))}
                aria-label={`Nota de ${criterio.codigo}, de 0 a ${fmt(max)}`}
                className="min-h-14 w-28 rounded-2xl border-2 border-line bg-surface px-3 text-center font-cond text-2xl font-extrabold tabular focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 dark:bg-white/[0.06]"
              />
              <span className="font-cond text-lg font-bold text-ink-3">/ {fmt(max)}</span>
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Notas rápidas">
            {atajos.map((a) => (
              <button
                key={a}
                type="button"
                disabled={soloLectura}
                onClick={() => poner(a)}
                className={`min-h-11 min-w-12 rounded-xl border-2 px-3 font-cond text-base font-bold transition-colors ${
                  calificado && valor.nota === a ? 'border-transparent bg-grad-primario text-white shadow-boton' : 'border-line bg-surface-2 text-ink-2 hover:border-accent dark:bg-white/[0.05]'
                }`}
              >
                {fmt(a)}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        aria-pressed={esNA}
        disabled={soloLectura}
        onClick={() => onCambio(esNA ? { ...valor, respuesta: undefined, nota: undefined } : { ...valor, respuesta: 'no_observado', nota: undefined })}
        className={`mt-3 min-h-11 rounded-xl border-2 px-4 font-cond text-base font-bold transition-colors ${
          esNA ? 'border-gris bg-gris-bg text-gris' : 'border-line bg-surface-2 text-ink-2 hover:border-accent dark:bg-white/[0.05]'
        }`}
      >
        {esNA ? 'N/A · no se observó (tocar para calificar)' : 'No se observó (N/A)'}
      </button>

      {valor.respuesta && (
        <Descripcion
          id={idComentario}
          valor={valor.comentario}
          onCambio={(v) => onCambio({ ...valor, comentario: v })}
          obligatoria
          falta={falta}
          etiqueta={esNA ? 'Por qué no se observó' : 'Descripción de lo observado'}
          placeholder={esNA ? 'Explica por qué este criterio no aplicó' : 'Describe lo que justifica la nota'}
        />
      )}
      {marcado && <p className="mt-2 text-sm font-semibold text-danger">{marcado}</p>}
    </fieldset>
  )
}

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
  const exigido = exigeComentario(criterio, valor.respuesta)
  const faltaComentario = exigido && !valor.comentario.trim()

  if (esDeNota(criterio)) return <ControlNota criterio={criterio} valor={valor} onCambio={onCambio} soloLectura={soloLectura} marcado={marcado} />

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
      {(exigido || valor.comentario) && (
        <div className="mt-3 flex flex-col gap-1">
          <label htmlFor={idComentario} className="text-sm font-semibold">
            Comentario{exigido && <span className="text-danger"> * obligatorio: la respuesta es desfavorable</span>}
          </label>
          <textarea
            id={idComentario}
            rows={2}
            value={valor.comentario}
            onChange={(e) => onCambio({ ...valor, comentario: e.target.value })}
            aria-required={exigido}
            aria-invalid={faltaComentario || undefined}
            placeholder="Describe lo observado"
            className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-base aria-[invalid=true]:border-danger"
          />
        </div>
      )}
      {!exigido && !valor.comentario && valor.respuesta && !soloLectura && (
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
  const deNota = criterios.length > 0 && criterios.every(esDeNota)
  const respondidos = criterios.filter((c) => respuestas[c.id]?.respuesta).length
  const pendientesComentario = criterios.filter((c) => exigeComentario(c, respuestas[c.id]?.respuesta) && !respuestas[c.id]?.comentario.trim()).length
  const completa = noObservada || (respondidos === criterios.length && pendientesComentario === 0)
  const conMarcas = criterios.some((c) => marcas[c.id])
  const [verCompetencias, setVer] = useState(false)

  // En los criterios de nota se muestra la nota puesta (x / máximo); en Sí/No, los puntos guardados.
  const c0 = criterios[0]
  const nota = deNota ? respuestas[c0.id] : undefined
  const subtitulo = deNota
    ? nota?.respuesta === 'no_observado'
      ? 'N/A · no se observó'
      : nota?.respuesta === 'si' && nota.nota != null
        ? `Nota ${fmt(nota.nota)} de ${fmt(Number(c0.nota_max))}`
        : `Vale ${fmt(Number(c0.nota_max))} puntos`
    : puntos?.observada
      ? `Puntos guardados: ${puntaje(puntos.puntos)}`
      : puntos
        ? 'Sin puntos guardados'
        : 'Aún sin guardar'

  let estado: { texto: string; clase: string }
  if (noObservada) estado = { texto: 'No observada', clase: 'bg-gris-bg text-gris' }
  else if (completa) estado = { texto: 'Completa', clase: 'bg-verde-bg text-verde' }
  else
    estado = {
      texto: deNota ? (pendientesComentario ? 'Falta descripción' : 'Pendiente') : `${respondidos}/${criterios.length}${pendientesComentario ? ` · falta comentario` : ''}`,
      clase: 'bg-amarillo-bg text-amarillo',
    }

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
            <span className="font-cond text-sm text-ink-3">{subtitulo}</span>
          </span>
          <span className={`shrink-0 rounded-md px-2 py-0.5 font-cond text-sm font-semibold ${estado.clase}`}>{estado.texto}</span>
          <span aria-hidden className={`shrink-0 text-ink-3 transition-transform ${abierta ? 'rotate-180' : ''}`}>
            <IcoAbajo className="size-5" />
          </span>
        </button>
      </h3>
      <div id={idPanel} hidden={!abierta} className="flex flex-col gap-3 border-t border-line px-4 py-4">
        {!deNota && (
          <>
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
          </>
        )}
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
