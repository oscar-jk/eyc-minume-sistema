import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Acento, Pestanas, Titulo } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { FormulariosPage } from '@/features/formularios/FormulariosPage'
import { AuditoriaPanel, CuentasPanel } from './Cuentas'
import { CortesPanel, PesosPanel } from './Pesos'
import { CatalogosPanel } from './Catalogos'
import { CriteriosPanel } from './Criterios'
import { FasesPanel } from './Fases'

type Tab = 'catalogos' | 'pesos' | 'cortes' | 'criterios' | 'fases' | 'cuentas' | 'auditoria' | 'formularios'

export function ConfiguracionPage() {
  const { perfil } = useSesion()
  const [sp] = useSearchParams()
  const admin = perfil?.rol === 'admin'
  // Subsecretaría y administración gestionan todo; EyC y Secretaría General solo usan Formularios.
  const gestiona = perfil?.rol === 'subsecretario' || admin
  const [tab, setTab] = useState<Tab>(() => {
    const t = sp.get('tab') as Tab | null
    if (!gestiona) return 'formularios'
    return t === 'cuentas' && !admin ? 'fases' : t || 'fases'
  })
  return (
    <>
      <Titulo sobre="Administración" adorno="bloques" sub={gestiona ? 'Todo cambio queda auditado. Lo que afecta cálculos pide confirmación.' : 'Crea formularios y consulta sus resultados.'}>
        Configuración <Acento>del</Acento> sistema
      </Titulo>
      <Pestanas
        etiqueta="Secciones de configuración"
        valor={tab}
        onCambio={setTab}
        opciones={[
          ...(gestiona
            ? [
                { valor: 'fases' as const, etiqueta: 'Fases y evento' },
                { valor: 'pesos' as const, etiqueta: 'Pesos y ponderaciones' },
                { valor: 'cortes' as const, etiqueta: 'Cortes y umbrales' },
                { valor: 'criterios' as const, etiqueta: 'Criterios de evaluación' },
                { valor: 'catalogos' as const, etiqueta: 'Comisiones y catálogos' },
                ...(admin ? [{ valor: 'cuentas' as const, etiqueta: 'Cuentas y permisos' }] : []),
                { valor: 'auditoria' as const, etiqueta: 'Auditoría' },
              ]
            : []),
          { valor: 'formularios' as const, etiqueta: 'Formularios' },
        ]}
      />
      {gestiona && tab === 'fases' && <FasesPanel />}
      {gestiona && tab === 'pesos' && <PesosPanel />}
      {gestiona && tab === 'cortes' && <CortesPanel />}
      {gestiona && tab === 'criterios' && <CriteriosPanel />}
      {gestiona && tab === 'catalogos' && <CatalogosPanel />}
      {admin && tab === 'cuentas' && <CuentasPanel />}
      {gestiona && tab === 'auditoria' && <AuditoriaPanel />}
      {tab === 'formularios' && <FormulariosPage embebido />}
    </>
  )
}
