import { useState } from 'react'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { Consulta } from '@/components/Estados'
import { Modal } from '@/components/Modal'
import { Aviso, Tarjeta } from '@/components/Ui'
import { mensajeError } from '@/lib/errores'
import { AMBITO, plural, suma } from '@/lib/formato'
import type { Ambito, Corte } from '@/lib/tipos'
import {
  contarCompletas,
  useActualizarConfig,
  useConfig,
  useCortes,
  useDimensiones,
  useGuardarCortes,
  useGuardarPesos,
  usePesos,
} from './api'

const input = 'w-20 rounded-lg border border-line-strong bg-surface px-2 py-2 text-right font-cond text-lg tabular min-h-11 aria-[invalid=true]:border-danger'

function Suma({ valor }: { valor: number }) {
  const dif = Math.round((100 - valor) * 100) / 100
  const ok = dif === 0
  return (
    <p role="status" className={`font-cond text-base font-semibold ${ok ? 'text-verde' : 'text-danger'}`}>
      Suma: {valor} {ok ? '✓' : dif > 0 ? `— faltan ${dif}` : `— sobran ${-dif}`}
    </p>
  )
}

/** Confirmación cuando el cambio altera puntajes ya calculados. */
function useConfirmacion() {
  const [estado, setEstado] = useState<{ n: number; accion: () => void } | null>(null)
  const pedir = async (ambito: Ambito | undefined, accion: () => void) => {
    const n = await contarCompletas(ambito)
    if (n === 0) accion()
    else setEstado({ n, accion })
  }
  const modal = (
    <Modal
      abierto={!!estado}
      titulo="Esto cambia puntajes ya calculados"
      onCerrar={() => setEstado(null)}
      acciones={
        <>
          <Boton variante="secundario" onClick={() => setEstado(null)}>
            Cancelar
          </Boton>
          <Boton
            onClick={() => {
              estado?.accion()
              setEstado(null)
            }}
          >
            Aplicar cambio
          </Boton>
        </>
      }
    >
      <p>
        Hay {plural(estado?.n ?? 0, 'evaluación completa', 'evaluaciones completas')} cuyo puntaje se recalculará con los nuevos valores. Las recomendaciones ya registradas
        conservan el puntaje y semáforo que tenían al registrarse.
      </p>
    </Modal>
  )
  return { pedir, modal }
}

export function PesosPanel() {
  const dims = useDimensiones()
  const pesos = usePesos()
  const config = useConfig()
  const guardar = useGuardarPesos()
  const confirmarCfg = useActualizarConfig()
  const avisar = useAvisar()
  const { pedir, modal } = useConfirmacion()
  const [edit, setEdit] = useState<Record<string, number>>({})
  const confirmados = config.data?.pesos_dimension_confirmados?.valor === true

  const valor = (a: Ambito, d: number) => edit[`${a}-${d}`] ?? Number(pesos.data?.find((p) => p.ambito === a && p.dimension_id === d)?.peso ?? 0)
  const total = (a: Ambito) => suma((dims.data ?? []).map((d) => valor(a, d.id)))

  const guardarAmbito = (a: Ambito) =>
    pedir(a, () =>
      guardar.mutate(
        { ambito: a, pesos: Object.fromEntries((dims.data ?? []).map((d) => [d.id, valor(a, d.id)])) },
        {
          onSuccess: () => {
            avisar(`Pesos de ${AMBITO[a]} guardados.`)
            setEdit((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(a))))
          },
          onError: (e) => avisar(mensajeError(e), 'error'),
        },
      ),
    )

  return (
    <Tarjeta titulo="Pesos por dimensión y ámbito">
      {!confirmados && (
        <div className="mb-4">
          <Aviso tono="alerta" titulo="Pesos provisionales">
            El instructivo no define los pesos A–F. Estos valores son un punto de partida y deben confirmarse por la Secretaría.
            <div className="mt-2">
              <Boton variante="secundario" cargando={confirmarCfg.isPending} onClick={() => confirmarCfg.mutate({ clave: 'pesos_dimension_confirmados', valor: true, provisional: false }, { onSuccess: () => avisar('Pesos marcados como definitivos.') })}>
                Marcar como definitivos
              </Boton>
            </div>
          </Aviso>
        </div>
      )}
      <Consulta q={dims}>
        {(ds) => (
          <div className="grid gap-5 md:grid-cols-2">
            {(['mesa', 'eyc'] as Ambito[]).map((a) => {
              const t = total(a)
              const sucio = Object.keys(edit).some((k) => k.startsWith(a))
              return (
                <fieldset key={a} className="rounded-2xl border border-line bg-surface p-4 dark:bg-white/[0.04]">
                  <legend className="px-1 font-semibold">{AMBITO[a]}</legend>
                  <ul className="flex flex-col gap-2">
                    {ds.map((d) => (
                      <li key={d.id} className="flex items-center gap-3">
                        <label htmlFor={`p-${a}-${d.id}`} className="flex-1">
                          <span className="font-cond font-bold text-acento">{d.clave}</span> {d.nombre}
                        </label>
                        <input
                          id={`p-${a}-${d.id}`}
                          className={input}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={100}
                          step="0.5"
                          value={valor(a, d.id)}
                          aria-invalid={t !== 100 || undefined}
                          onChange={(e) => setEdit({ ...edit, [`${a}-${d.id}`]: Number(e.target.value) })}
                        />
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Suma valor={t} />
                    <Boton disabled={t !== 100 || !sucio} cargando={guardar.isPending && guardar.variables?.ambito === a} onClick={() => guardarAmbito(a)}>
                      Guardar
                    </Boton>
                  </div>
                  {t !== 100 && <p className="mt-1 text-sm text-ink-2">Mientras no sumen 100, el cálculo de este ámbito queda bloqueado. No se puede guardar así.</p>}
                </fieldset>
              )
            })}
          </div>
        )}
      </Consulta>
      {modal}
    </Tarjeta>
  )
}

export function CortesPanel() {
  const cortes = useCortes()
  const guardar = useGuardarCortes()
  const avisar = useAvisar()
  const { pedir, modal } = useConfirmacion()
  const [edit, setEdit] = useState<Record<number, Partial<Corte>>>({})
  const val = (c: Corte) => ({ ...c, ...edit[c.id] })
  const lista = (cortes.data ?? []).map(val)
  const total = suma(lista.map((c) => Number(c.peso)))
  const umbralesMal = lista.some((c) => !(Number(c.umbral_amarillo) >= 0 && Number(c.umbral_amarillo) < Number(c.umbral_verde) && Number(c.umbral_verde) <= 100))

  const campo = (c: Corte, k: 'peso' | 'umbral_verde' | 'umbral_amarillo', etiqueta: string) => (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {etiqueta}
      <input
        className={input}
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step="0.5"
        value={Number(val(c)[k])}
        onChange={(e) => setEdit({ ...edit, [c.id]: { ...edit[c.id], [k]: Number(e.target.value) } })}
      />
    </label>
  )

  return (
    <Tarjeta titulo="Cortes: peso en el puntaje final y umbrales del semáforo">
      <Consulta q={cortes}>
        {(cs) => (
          <div className="flex flex-col gap-3">
            {cs.map((c) => (
              <fieldset key={c.id} className="rounded-2xl border border-line bg-surface p-4 dark:bg-white/[0.04]">
                <legend className="px-1 font-semibold">{c.nombre}</legend>
                <p className="mb-3 text-sm text-ink-2">{c.proposito}</p>
                <div className="flex flex-wrap gap-4">
                  {campo(c, 'peso', 'Peso (%)')}
                  {campo(c, 'umbral_verde', 'Verde desde')}
                  {campo(c, 'umbral_amarillo', 'Amarillo desde')}
                </div>
                <p className="mt-2 font-cond text-sm text-ink-3">
                  Rojo por debajo de {Number(val(c).umbral_amarillo)}. Sin evaluaciones: gris (no evaluado), nunca 0.
                </p>
              </fieldset>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Suma valor={total} />
              <Boton
                disabled={total !== 100 || umbralesMal || !Object.keys(edit).length}
                cargando={guardar.isPending}
                onClick={() =>
                  pedir(undefined, () =>
                    guardar.mutate(
                      lista.map((c) => ({ id: c.id, peso: Number(c.peso), umbral_verde: Number(c.umbral_verde), umbral_amarillo: Number(c.umbral_amarillo) })),
                      {
                        onSuccess: () => {
                          avisar('Cortes guardados.')
                          setEdit({})
                        },
                        onError: (e) => avisar(mensajeError(e), 'error'),
                      },
                    ),
                  )
                }
              >
                Guardar cortes
              </Boton>
            </div>
            {umbralesMal && <Aviso tono="peligro">Cada umbral amarillo debe ser menor que el verde, y ambos entre 0 y 100.</Aviso>}
          </div>
        )}
      </Consulta>
      {modal}
    </Tarjeta>
  )
}
