import { useState } from 'react'
import { Pestanas, Titulo } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { AuditoriaPanel, CuentasPanel } from './Cuentas'
import { CortesPanel, PesosPanel } from './Pesos'
import { CriteriosPanel } from './Criterios'
import { FasesPanel } from './Fases'

type Tab = 'pesos' | 'cortes' | 'criterios' | 'fases' | 'cuentas' | 'auditoria'

export function ConfiguracionPage() {
  const { perfil } = useSesion()
  const [tab, setTab] = useState<Tab>('fases')
  const admin = perfil?.rol === 'admin'
  return (
    <>
      <Titulo sub="Todo cambio queda auditado. Lo que afecta cálculos pide confirmación.">Configuración</Titulo>
      <Pestanas
        etiqueta="Secciones de configuración"
        valor={tab}
        onCambio={setTab}
        opciones={[
          { valor: 'fases', etiqueta: 'Fases y evento' },
          { valor: 'pesos', etiqueta: 'Pesos A–F' },
          { valor: 'cortes', etiqueta: 'Cortes y umbrales' },
          { valor: 'criterios', etiqueta: 'Criterios' },
          ...(admin ? [{ valor: 'cuentas' as const, etiqueta: 'Cuentas' }] : []),
          { valor: 'auditoria', etiqueta: 'Auditoría' },
        ]}
      />
      {tab === 'fases' && <FasesPanel />}
      {tab === 'pesos' && <PesosPanel />}
      {tab === 'cortes' && <CortesPanel />}
      {tab === 'criterios' && <CriteriosPanel />}
      {tab === 'cuentas' && admin && <CuentasPanel />}
      {tab === 'auditoria' && <AuditoriaPanel />}
    </>
  )
}
