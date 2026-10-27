import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { datos } from '@/lib/consulta'

/** Una fila por persona para el corte elegido, con semáforo, asignación vigente y continuidad. */
export function useMonitoreo(corteId: number | undefined) {
  return useQuery({
    queryKey: ['monitoreo', corteId],
    enabled: !!corteId,
    queryFn: async () => datos(await supabase.from('v_monitoreo').select('*').eq('corte_id', corteId!).order('nombre')),
  })
}

export function useCobertura() {
  return useQuery({
    queryKey: ['cobertura'],
    queryFn: async () => datos(await supabase.from('v_cobertura').select('*').order('fase_id').order('comision_id')),
  })
}

export interface DashboardMonitoreo {
  resumen: {
    personas: number
    evaluadas: number
    promedio: number | null
    mediana: number | null
    minimo: number | null
    maximo: number | null
    evaluaciones_completas: number
    borradores: number
    verde: number
    amarillo: number
    rojo: number
    gris: number
    con_recomendacion: number
    elevados_pendientes: number
    decididos: number
    rojos_sin_recomendacion: number
  }
  distribucion: { desde: number; hasta: number; n: number }[]
  por_comision: { comision_id: number; sigla: string; personas: number; evaluadas: number; promedio: number | null; minimo: number | null; maximo: number | null; verde: number; amarillo: number; rojo: number }[]
  por_cargo: { cargo: string; evaluadas: number; promedio: number | null }[]
  por_dimension: { clave: string; nombre: string; seccion: string | null; orden: number; promedio: number; observaciones: number; puntos: number | null }[]
  tendencia: { dia: string; promedio: number; evaluaciones: number }[]
  mejores: { persona_id: string; nombre: string; comision: string | null; puntaje: number; n: number }[]
  atencion: { persona_id: string; nombre: string; comision: string | null; puntaje: number; n: number; semaforo: 'verde' | 'amarillo' | 'rojo' | 'gris'; recomendacion: string | null }[]
}

/** Todas las cifras del dashboard las calcula la base (RPC `dashboard_monitoreo`); la pantalla solo las dibuja. */
export function useDashboard(corteId: number | undefined, ambito: 'mesa' | 'eyc' | null) {
  return useQuery({
    queryKey: ['monitoreo', 'dashboard', corteId, ambito],
    enabled: !!corteId,
    queryFn: async () => datos(await supabase.rpc('dashboard_monitoreo', { p_corte: corteId!, ...(ambito ? { p_ambito: ambito } : {}) })) as unknown as DashboardMonitoreo,
  })
}
