import { Link } from 'react-router-dom'
import { Consulta } from '@/components/Estados'
import { Acento, Titulo } from '@/components/Ui'
import { useVigentes } from '@/features/asignaciones/api'
import { siglaDe, useCargos, useComisiones } from './api'

export function ComisionesPage() {
  const q = useComisiones()
  const vigentes = useVigentes()
  const cargos = useCargos()
  const totalMesa = (cargos.data ?? []).filter((c) => c.ambito === 'mesa').length
  return (
    <>
      <Titulo sobre="15 comisiones" adorno="damero" sub="Panel de cada comisión: mesa directiva, actividades e histórico">
        Las <Acento>comisiones</Acento>
      </Titulo>
      <Consulta q={q}>
        {(coms) => (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coms.map((c) => {
              const mesa = (vigentes.data ?? []).filter((v) => v.comision_id === c.id && v.ambito === 'mesa')
              return (
                <li key={c.id}>
                  <Link to={`/comisiones/${c.id}`} className="flex h-full flex-col gap-1 rounded-2xl border border-line bg-surface p-4 shadow-card hover:border-accent">
                    <span className="font-cond text-2xl font-extrabold texto-grad">{siglaDe(c)}</span>
                    <span className="text-sm text-ink-2">{c.nombre}</span>
                    <span className="mt-auto pt-2 font-cond text-sm text-ink-3">{mesa.length} de {totalMesa} cargos de la mesa ocupados</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Consulta>
    </>
  )
}
