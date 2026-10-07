import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { datos } from '@/lib/consulta'
import type { Ambito, TipoActividad } from '@/lib/tipos'

/** Actividades visibles para el usuario (RLS limita al EyC a su comisión y a las generales). */
export function useActividades(filtro: { comisionId?: number | null; ambito?: Ambito } = {}) {
  return useQuery({
    queryKey: ['actividades', filtro],
    queryFn: async () => {
      let q = supabase.from('actividades').select('*, fase:fases(nombre, estado), comision:comisiones(sigla, clave)').order('fecha', { ascending: false })
      if (filtro.comisionId) q = q.or(`comision_id.eq.${filtro.comisionId},comision_id.is.null`)
      if (filtro.ambito) q = q.eq('ambito', filtro.ambito)
      return datos(await q)
    },
  })
}

export function useActividad(id: string | undefined) {
  return useQuery({
    queryKey: ['actividades', 'una', id],
    enabled: !!id,
    queryFn: async () => datos(await supabase.from('actividades').select('*').eq('id', id!).single()),
  })
}

export function useCrearActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: { fase_id: number; comision_id: number | null; ambito: Ambito; tipo: TipoActividad; nombre: string; fecha: string }) =>
      datos(await supabase.from('actividades').insert(a).select().single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actividades'] }),
  })
}

export function useCerrarActividad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { id: string; cerrada: boolean }) =>
      datos(await supabase.from('actividades').update({ cerrada: p.cerrada }).eq('id', p.id).select().single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actividades'] }),
  })
}
