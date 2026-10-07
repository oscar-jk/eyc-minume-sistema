import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Acento, Pestanas, Titulo } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { AuditoriaPanel, CuentasPanel } from './Cuentas'
import { CortesPanel, PesosPanel } from './Pesos'
import { CatalogosPanel } from './Catalogos'
import { CriteriosPanel } from './Criterios'
import { FasesPanel } from './Fases'

type Tab = 'catalogos' | 'pesos' | 'cortes' | 'criterios' | 'fases' | 'cuentas' | 'auditoria'

export function ConfiguracionPage() {
  const { perfil } = useSesion()
  const [sp] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => (sp.get('tab') as Tab) || 'fases')
  const admin = perfil?.rol === 'admin'
  return (
    <>
      <Titulo sobre="Secretaría" adorno="bloques" sub="Todo cambio queda auditado. Lo que afecta cálculos pide confirmación.">
        Configuración <Acento>del</Acento> sistema
      </Titulo>
      <Pestanas
        etiqueta="Secciones de configuración"
        valor={tab}
        onCambio={setTab}
        opciones={[
          { valor: 'fases', etiqueta: 'Fases y evento' },
          { valor: 'pesos', etiqueta: 'Pesos A–F' },
          { valor: 'cortes', etiqueta: 'Cortes y umbrales' },
          { valor: 'criterios', etiqueta: 'Criterios' },
          { valor: 'catalogos', etiqueta: 'Comisiones y catálogos' },
          ...(admin ? [{ valor: 'cuentas' as const, etiqueta: 'Cuentas' }] : []),
          { valor: 'auditoria', etiqueta: 'Auditoría' },
        ]}
      />
      {tab === 'fases' && <FasesPanel />}
      {tab === 'pesos' && <PesosPanel />}
      {tab === 'cortes' && <CortesPanel />}
      {tab === 'criterios' && <CriteriosPanel />}
      {tab === 'catalogos' && <CatalogosPanel />}
      {tab === 'cuentas' && admin && <CuentasPanel />}
      {tab === 'auditoria' && <AuditoriaPanel />}
    </>
  )
}
