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
