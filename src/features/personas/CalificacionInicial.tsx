import { useMemo, useState } from 'react'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { AreaTexto, Campo } from '@/components/Campo'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Modal } from '@/components/Modal'
import { Aviso, Insignia, Tabla, Tarjeta } from '@/components/Ui'
import { useConfig, useGuardarConfig } from '@/features/configuracion/api'
import { mensajeError } from '@/lib/errores'
import { puntaje } from '@/lib/formato'
import { useCalificacionInicial, useGuardarCalificacionInicial, type NotaInicial } from './api'

const sinAcentos = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
const entrada = 'min-h-11 w-24 rounded-lg border border-line-strong bg-surface px-2 text-right font-cond text-lg tabular aria-[invalid=true]:border-danger'

type Edicion = Record<string, { examen?: string; pares?: string }>

/** Pesos de la calificación inicial (examen · institucional · pares). Deben sumar 100. */
function PesosIniciales() {
  const config = useConfig()
  const guardar = useGuardarConfig()
  const avisar = useAvisar()
  const v = (config.data?.ponderacion_inicial?.valor ?? { examen: 50, institucional: 30, pares: 20 }) as Record<string, number>
  const [w, setW] = useState({ examen: String(v.examen ?? 50), institucional: String(v.institucional ?? 30), pares: String(v.pares ?? 20) })
  const suma = Number(w.examen) + Number(w.institucional) + Number(w.pares)
  return (
    <details className="rounded-2xl border border-line bg-surface p-4 dark:bg-white/[0.04]">
      <summary className="cursor-pointer font-bold">Pesos de la calificación inicial</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Campo etiqueta="Examen académico (%)" type="number" value={w.examen} onChange={(e) => setW({ ...w, examen: e.target.value })} />
        <Campo etiqueta="Evaluación institucional (%)" type="number" value={w.institucional} onChange={(e) => setW({ ...w, institucional: e.target.value })} ayuda="Es la nota del Corte 1." />
        <Campo etiqueta="Evaluación entre pares (%)" type="number" value={w.pares} onChange={(e) => setW({ ...w, pares: e.target.value })} />
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
              { clave: 'ponderacion_inicial', valor: { examen: Number(w.examen), institucional: Number(w.institucional), pares: Number(w.pares) }, descripcion: 'Pesos de la calificación inicial (suman 100).' },
              { onSuccess: () => avisar('Pesos guardados.'), onError: (e) => avisar(mensajeError(e), 'error') },
            )
          }
        >
          Guardar pesos
        </Boton>
      </div>
    </details>
  )
}

function CeldaNota({
  id,
  k,
  nombre,
  base,
  edit,
  onCambio,
  valor,
  fuera,
}: {
  id: string
  k: 'examen' | 'pares'
  nombre: string | null
  base: number | null
  edit: Edicion
  onCambio: (e: Edicion) => void
  valor: (id: string, k: 'examen' | 'pares', base: number | null) => string
  fuera: (t: string) => boolean
}) {
  const t = valor(id, k, base)
  return (
    <td className="text-right">
      <input
        className={entrada}
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step="0.5"
        aria-label={`${k === 'examen' ? 'Examen' : 'Pares'} de ${nombre}`}
        aria-invalid={fuera(t) || undefined}
        value={t}
        onChange={(e) => onCambio({ ...edit, [id]: { ...edit[id], [k]: e.target.value } })}
      />
    </td>
  )
}

/** Captura de la calificación inicial: la Subsecretaría escribe el examen y los pares; la institucional sale del Corte 1. */
export function CalificacionInicialPanel() {
  const q = useCalificacionInicial()
  const config = useConfig()
  const guardar = useGuardarCalificacionInicial()
  const avisar = useAvisar()
  const [edit, setEdit] = useState<Edicion>({})
  const [pegar, setPegar] = useState<string | null>(null)
  const w = (config.data?.ponderacion_inicial?.valor ?? { examen: 50, institucional: 30, pares: 20 }) as Record<string, number>

  const valor = (id: string, k: 'examen' | 'pares', base: number | null) => edit[id]?.[k] ?? (base == null ? '' : String(base))
  const fueraDeRango = (t: string) => t !== '' && !(Number(t) >= 0 && Number(t) <= 100)
  const cambios = useMemo(() => Object.keys(edit), [edit])

  const guardarTodo = () => {
    const filas: NotaInicial[] = (q.data ?? [])
      .filter((p) => edit[p.persona_id!])
      .map((p) => ({
        persona_id: p.persona_id!,
        examen: valor(p.persona_id!, 'examen', p.examen) === '' ? null : Number(valor(p.persona_id!, 'examen', p.examen)),
        pares: valor(p.persona_id!, 'pares', p.pares) === '' ? null : Number(valor(p.persona_id!, 'pares', p.pares)),
      }))
    guardar.mutate(filas, {
      onSuccess: () => {
        avisar(`Calificaciones guardadas (${filas.length}).`)
        setEdit({})
      },
      onError: (e) => avisar(mensajeError(e), 'error'),
    })
  }

  // Pegar desde Excel: «Nombre; examen; pares» (acepta tabulaciones, punto y coma o coma).
  const analizar = (txt: string) => {
    const nombres = new Map((q.data ?? []).map((p) => [sinAcentos(p.nombre ?? ''), p]))
    return txt
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [n, e, p] = l.split(/[\t;]/).map((x) => x.trim())
        const persona = nombres.get(sinAcentos(n ?? ''))
        const num = (x?: string) => (x == null || x === '' ? '' : x.replace(',', '.'))
        return { linea: l, persona, examen: num(e), pares: num(p) }
      })
  }
  const lineas = pegar != null ? analizar(pegar) : []
  const aplicables = lineas.filter((l) => l.persona && !fueraDeRango(l.examen) && !fueraDeRango(l.pares))

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta
        titulo="Calificación inicial"
        accion={
          <Boton variante="secundario" onClick={() => setPegar('')}>
            Pegar notas desde Excel
          </Boton>
        }
      >
        <p className="mb-4 text-sm text-ink-2">
          Define los roles del Día 1. Se calcula con el <strong>examen académico ({w.examen} %)</strong>, la <strong>evaluación institucional ({w.institucional} %)</strong> —que sale sola de la nota
          del Corte 1— y la <strong>evaluación entre pares ({w.pares} %)</strong>. El total aparece cuando están las tres.
        </p>
        <Consulta q={q} vacio={<EstadoVacio titulo="Todavía no hay miembros de mesa" />}>
          {(ps) => (
            <div className="flex flex-col gap-4">
              <Tabla etiqueta="Calificación inicial de la mesa directiva">
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th className="text-right">Examen</th>
                    <th className="text-right">Institucional</th>
                    <th className="text-right">Pares</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ps.map((p) => {
                    const id = p.persona_id!
                    return (
                      <tr key={id}>
                        <td className="font-semibold">{p.nombre}</td>
                        <CeldaNota id={id} k="examen" nombre={p.nombre} base={p.examen} edit={edit} onCambio={setEdit} valor={valor} fuera={fueraDeRango} />
                        <td className="text-right tabular">{p.institucional == null ? <span className="text-ink-3">sin evaluar</span> : puntaje(p.institucional)}</td>
                        <CeldaNota id={id} k="pares" nombre={p.nombre} base={p.pares} edit={edit} onCambio={setEdit} valor={valor} fuera={fueraDeRango} />
                        <td className="text-right text-lg font-extrabold tabular">{edit[id] ? <Insignia tono="alerta">sin guardar</Insignia> : p.total == null ? <span className="text-ink-3">—</span> : puntaje(p.total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </Tabla>
              <div className="flex flex-wrap gap-2">
                <Boton
                  cargando={guardar.isPending}
                  disabled={!cambios.length || ps.some((p) => edit[p.persona_id!] && (fueraDeRango(valor(p.persona_id!, 'examen', p.examen)) || fueraDeRango(valor(p.persona_id!, 'pares', p.pares))))}
                  onClick={guardarTodo}
                >
                  Guardar cambios{cambios.length ? ` (${cambios.length})` : ''}
                </Boton>
                <Boton variante="secundario" disabled={!cambios.length} onClick={() => setEdit({})}>
                  Descartar
                </Boton>
              </div>
            </div>
          )}
        </Consulta>
      </Tarjeta>

      <PesosIniciales />

      <Modal
        abierto={pegar != null}
        titulo="Pegar notas desde Excel"
        onCerrar={() => setPegar(null)}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setPegar(null)}>
              Cancelar
            </Boton>
            <Boton
              disabled={!aplicables.length}
              onClick={() => {
                const n = { ...edit }
                for (const l of aplicables) n[l.persona!.persona_id!] = { examen: l.examen, pares: l.pares }
                setEdit(n)
                setPegar(null)
                avisar(`${aplicables.length} filas cargadas: revisa y toca «Guardar cambios».`)
              }}
            >
              {aplicables.length === 1 ? 'Cargar 1 fila' : `Cargar ${aplicables.length || ''} filas`}
            </Boton>
          </>
        }
      >
        <p className="mb-2 text-sm text-ink-2">
          Una persona por línea: <strong>Nombre; examen; pares</strong> (también sirve copiar columnas de Excel). Deja vacío lo que no tengas todavía.
        </p>
        <AreaTexto etiqueta="Notas" rows={6} value={pegar ?? ''} onChange={(e) => setPegar(e.target.value)} placeholder={'María Fernanda Peña; 92; 88\nLuis Alberto Gómez; 75;'} />
        {lineas.length > 0 && (
          <ul className="mt-3 flex max-h-48 flex-col gap-1 overflow-y-auto text-sm">
            {lineas.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-1.5 dark:bg-white/[0.05]">
                <span className="truncate">{l.persona ? l.persona.nombre : l.linea}</span>
                {!l.persona ? <Insignia tono="peligro">No encontrada</Insignia> : fueraDeRango(l.examen) || fueraDeRango(l.pares) ? <Insignia tono="alerta">Nota fuera de 0–100</Insignia> : <Insignia tono="exito">Lista</Insignia>}
              </li>
            ))}
          </ul>
        )}
        {lineas.some((l) => !l.persona) && (
          <div className="mt-3">
            <Aviso tono="alerta">Las líneas «No encontrada» no se cargan: revisa que el nombre sea el mismo que en Personas.</Aviso>
          </div>
        )}
      </Modal>
    </div>
  )
}
