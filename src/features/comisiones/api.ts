import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { datos } from '@/lib/consulta'

export function useComisiones() {
  return useQuery({
    queryKey: ['comisiones'],
    queryFn: async () => datos(await supabase.from('comisiones').select('*').order('orden')),
    staleTime: 10 * 60_000,
  })
}

export function useCargos() {
  return useQuery({
    queryKey: ['cargos'],
    queryFn: async () => datos(await supabase.from('cargos').select('*').order('orden')),
    staleTime: 10 * 60_000,
  })
}

/** Sigla visible de una comisión; las que no tienen sigla aún se muestran como "por definir". */
export function siglaDe(c: { sigla: string | null; clave: string } | undefined | null): string {
  if (!c) return '—'
  return c.sigla ?? `${c.clave.toUpperCase()} (sigla por definir)`
}
