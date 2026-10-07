import { CieloEstrellado } from '@/components/CieloEstrellado'
import { Consulta } from "@/components/Estados";
import { Semaforo } from "@/components/Semaforo";
import { Insignia } from "@/components/Ui";
import { useCortes } from "@/features/configuracion/api";
import { useContinuidad } from "@/features/continuidad/api";
import { ESTATUS, puntaje } from "@/lib/formato";
import { usePuntajesPersona } from "./api";

/**
 * Tabla del instructivo: Corte 1, Corte 2, Evaluación Final, Estatus de Continuidad y Puntaje Final.
 * Todo lo numérico viene calculado de la base; el puntaje final queda "en espera" mientras falte un corte.
 */
export function TablaCortes({
  personaId,
  onDetalle,
}: {
  personaId: string;
  onDetalle?: (corteId: number) => void;
}) {
  const q = usePuntajesPersona(personaId);
  const cont = useContinuidad(personaId);
  const catalogo = useCortes();

  return (
    <Consulta q={q}>
      {({ cortes, final }) => (
        <>
          {/* Teléfono: tarjetas apiladas, sin desplazamiento lateral */}
          <div className="flex flex-col gap-3 sm:hidden">
            <div className="relative isolate overflow-hidden rounded-3xl bg-grad-heroe p-5 text-white shadow-boton">
            <CieloEstrellado densidad={1.6} className="-z-10" />
              <p className="sobretitulo text-cian">Puntaje final</p>
              {final?.puntaje_final != null ? (
                <p className="font-cond text-6xl font-extrabold leading-none tabular">
                  {puntaje(final.puntaje_final)}
                </p>
              ) : (
                <>
                  <p className="text-3xl font-black">En espera</p>
                  <p className="mt-1 text-sm text-white/80">
                    Se calcula cuando los tres cortes tengan evaluaciones
                    completas.
                  </p>
                </>
              )}
              <p className="mt-3 text-sm">
                Continuidad:{" "}
                <strong>{ESTATUS[cont.data?.estatus ?? "no_evaluado"]}</strong>
              </p>
            </div>
            {cortes.map((c) => (
              <div
                key={c.corte_id}
                className="rounded-2xl border border-line bg-surface p-4 dark:bg-white/[0.04]"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-extrabold">{c.corte_nombre}</p>
                  <span className="font-cond text-sm font-bold text-ink-3">
                    {puntaje(c.corte_peso)} %
                  </span>
                </div>
                <p className="mb-2 text-sm text-ink-3">
                  {catalogo.data?.find((k) => k.id === c.corte_id)?.proposito}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Semaforo
                    semaforo={c.semaforo}
                    puntaje={c.puntaje}
                    n={c.n_evaluaciones}
                  />
                  {c.n_borradores ? (
                    <Insignia tono="alerta">
                      {c.n_borradores} en borrador
                    </Insignia>
                  ) : null}
                  {onDetalle && (c.n_evaluaciones ?? 0) > 0 && (
                    <button
                      type="button"
                      className="min-h-9 text-sm font-bold text-acento"
                      onClick={() => onDetalle(c.corte_id!)}
                    >
                      Ver detalle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div
            className="hidden overflow-x-auto rounded-2xl border border-line sm:block"
            role="region"
            aria-label="Resultados por corte"
            tabIndex={0}
          >
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead className="bg-surface-2 font-cond text-ink-2">
                <tr>
                  <th className="px-3 py-2 font-semibold">Campo</th>
                  <th className="px-3 py-2 font-semibold">Propósito</th>
                  <th className="px-3 py-2 font-semibold">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {cortes.map((c) => (
                  <tr key={c.corte_id} className="border-t border-line">
                    <th scope="row" className="px-3 py-3 font-semibold">
                      {c.corte_nombre}
                      <span className="block font-cond text-sm font-medium text-ink-3">
                        {puntaje(c.corte_peso)} %
                      </span>
                    </th>
                    <td className="px-3 py-3 text-ink-2">
                      {
                        catalogo.data?.find((k) => k.id === c.corte_id)
                          ?.proposito
                      }
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Semaforo
                          semaforo={c.semaforo}
                          puntaje={c.puntaje}
                          n={c.n_evaluaciones}
                        />
                        {c.n_borradores ? (
                          <Insignia tono="alerta">
                            {c.n_borradores} en borrador
                          </Insignia>
                        ) : null}
                        {c.pesos_validos === false && (
                          <Insignia tono="peligro">
                            Cálculo bloqueado: pesos ≠ 100
                          </Insignia>
                        )}
                        {onDetalle && (c.n_evaluaciones ?? 0) > 0 && (
                          <button
                            type="button"
                            className="min-h-9 text-sm font-bold text-acento underline-offset-4 hover:underline"
                            onClick={() => onDetalle(c.corte_id!)}
                          >
                            Ver detalle
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line">
                  <th scope="row" className="px-3 py-3 font-semibold">
                    Estatus de Continuidad
                  </th>
                  <td className="px-3 py-3 text-ink-2">Decisión operativa</td>
                  <td className="px-3 py-3">
                    <Insignia
                      tono={
                        cont.data?.estatus === "sustitucion"
                          ? "peligro"
                          : cont.data?.estatus === "seguimiento"
                            ? "alerta"
                            : cont.data?.estatus === "continua"
                              ? "exito"
                              : "neutro"
                      }
                    >
                      {ESTATUS[cont.data?.estatus ?? "no_evaluado"]}
                    </Insignia>
                    {cont.data?.tiene_pendiente && (
                      <span className="ml-2 text-sm text-ink-3">
                        · hay una recomendación pendiente de decisión
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="border-t-2 border-line-strong bg-surface-2">
                  <th scope="row" className="px-3 py-3 font-bold">
                    Puntaje Final
                  </th>
                  <td className="px-3 py-3 text-ink-2">
                    Consolidación (0–100)
                  </td>
                  <td className="px-3 py-3">
                    {final?.puntaje_final != null ? (
                      <span className="font-cond text-2xl font-bold tabular">
                        {puntaje(final.puntaje_final)}
                      </span>
                    ) : (
                      <span className="font-semibold text-ink-2">
                        En espera
                        <span className="block font-cond text-sm font-medium text-ink-3">
                          Se calcula cuando los tres cortes tengan evaluaciones
                          completas.
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </Consulta>
  );
}
