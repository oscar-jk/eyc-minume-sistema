import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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


/** Edición de una comisión (admin): nombre, sigla y si está activa. */
export function useEditarComision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { id: number; nombre: string; sigla: string | null; activa: boolean }) => {
      const { id, ...cambios } = p
      datos(await supabase.from('comisiones').update(cambios).eq('id', id).select().single())
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

/** Edición del nombre visible de un cargo (admin). */
export function useEditarCargo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { id: number; nombre: string }) => {
      datos(await supabase.from('cargos').update({ nombre: p.nombre }).eq('id', p.id).select().single())
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}
