import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Boton } from '@/components/Boton'
import { Consulta } from '@/components/Estados'
import { Acento, Insignia, Titulo } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { useVigentes } from '@/features/asignaciones/api'
import { EditarComision } from '@/features/configuracion/Catalogos'
import type { Comision } from '@/lib/tipos'
import { useCargos, useComisiones } from './api'

export function ComisionesPage() {
  const { perfil } = useSesion()
  const q = useComisiones()
  const vigentes = useVigentes()
  const cargos = useCargos()
  const [editar, setEditar] = useState<Comision | null>(null)
  const totalMesa = (cargos.data ?? []).filter((c) => c.ambito === 'mesa').length
  return (
    <>
      <Titulo sobre={`${q.data?.length ?? 15} comisiones`} adorno="damero" sub="Panel de cada comisión: mesa directiva, actividades e histórico">
        Las <Acento>comisiones</Acento>
      </Titulo>
      <Consulta q={q}>
        {(coms) => (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {coms.map((c) => {
              const mesa = (vigentes.data ?? []).filter((v) => v.comision_id === c.id && v.ambito === 'mesa').length
              const pct = totalMesa ? Math.round((mesa / totalMesa) * 100) : 0
              return (
                <li
                  key={c.id}
                  className="animar-entrada relative flex flex-col overflow-hidden rounded-[28px] rounded-tr-[6px] border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-accent dark:bg-vidrio"
                >
                  <Link to={`/comisiones/${c.id}`} className="flex flex-1 flex-col gap-3 p-5">
                    <span className="flex flex-wrap items-start gap-2">
                      <span className="rounded-xl rounded-tr-sm bg-grad-primario px-3 py-1.5 font-cond text-2xl font-extrabold leading-none text-white shadow-boton">
                        {c.sigla ?? c.clave.split('-')[0].toUpperCase()}
                      </span>
                      {!c.sigla && <Insignia tono="alerta">Sigla por definir</Insignia>}
                      {!c.activa && <Insignia>Inactiva</Insignia>}
                    </span>
                    <span className="font-bold leading-snug text-ink">{c.nombre}</span>
                    <span className="mt-auto">
                      <span className="mb-1 flex justify-between font-cond text-sm font-bold text-ink-3">
                        <span>Mesa directiva</span>
                        <span className="tabular">
                          {mesa}/{totalMesa}
                        </span>
                      </span>
                      <span className="block h-2 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-grad-celeste" style={{ width: `${pct}%` }} />
                      </span>
                    </span>
                  </Link>
                  {perfil?.rol === 'admin' && (
                    <div className="border-t border-line px-5 py-2">
                      <Boton variante="fantasma" className="min-h-9 w-full" onClick={() => setEditar(c)}>
                        Editar nombre y sigla
                      </Boton>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Consulta>
      {editar && <EditarComision key={editar.id} comision={editar} onCerrar={() => setEditar(null)} />}
    </>
  )
}
