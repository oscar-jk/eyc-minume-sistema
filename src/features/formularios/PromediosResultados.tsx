import { Tarjeta } from '@/components/Ui'
import type { Promedio, PromedioGeneral } from './filtrarRespuestas'

const fmt = (n: number) => n.toLocaleString('es-DO', { maximumFractionDigits: 2 })

/** Promedio de una pregunta, en una etiqueta para ponerla dentro de su propia tarjeta. */
export function PromedioInsignia({ p }: { p: Promedio }) {
  return (
    <p className="inline-flex flex-wrap items-baseline gap-x-2 rounded-2xl bg-accent-soft px-3 py-1.5" aria-label={`Promedio ${fmt(p.promedio)}`}>
      <span className="font-cond text-xs font-bold uppercase tracking-wider text-acento">Promedio</span>
      <span className="font-cond text-2xl font-extrabold tabular leading-none">{fmt(p.promedio)}</span>
      <span className="font-cond text-xs text-ink-3">
        {p.rango ? `de ${p.rango[0]} a ${p.rango[1]} · ` : ''}
        {p.n === p.de ? `${p.n} respuestas` : `${p.n} de ${p.de} (solo las que son un número)`}
      </span>
    </p>
  )
}

/** Promedios arriba de los resultados: uno general por escala y uno por pregunta, para no calcularlos a mano. */
export function PromediosResultados({ generales, porPregunta, comision }: { generales: PromedioGeneral[]; porPregunta: Promedio[]; comision: (id: number) => string }) {
  if (!porPregunta.length) return null
  return (
    <Tarjeta titulo="Promedios">
      <div className="flex flex-col gap-5">
        {generales.map((g) => (
          <div key={g.etiqueta} className="rounded-2xl bg-grad-heroe p-4 text-white">
            <p className="font-cond text-xs font-bold uppercase tracking-wider text-cian">Promedio general · preguntas de {g.etiqueta}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-cond text-5xl font-extrabold tabular leading-none">{fmt(g.promedio)}</span>
              <span className="text-sm text-white/85">en {g.preguntas} preguntas</span>
            </p>
            {g.porComision.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Promedio general por comisión">
                {g.porComision
                  .slice()
                  .sort((a, b) => b.promedio - a.promedio)
                  .map((c) => (
                    <li key={c.comision} className="rounded-xl bg-white/15 px-3 py-1 text-sm font-semibold">
                      {comision(c.comision)} <span className="font-cond tabular">{fmt(c.promedio)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ))}

        <ul className="grid gap-2 sm:grid-cols-2">
          {porPregunta.map((p) => (
            <li key={p.campo.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 dark:bg-white/[0.04]">
              <span className="texto-grad min-w-[3.5rem] font-cond text-3xl font-extrabold tabular leading-none">{fmt(p.promedio)}</span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-bold leading-snug">{p.campo.etiqueta}</span>
                <span className="font-cond text-xs text-ink-3">
                  {p.rango ? `de ${p.rango[0]} a ${p.rango[1]} · ` : ''}
                  {p.n === p.de ? `${p.n} respuestas` : `${p.n} de ${p.de} respuestas (solo las que son un número)`}
                  {p.min !== p.max ? ` · de ${fmt(p.min)} a ${fmt(p.max)}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Tarjeta>
  )
}
