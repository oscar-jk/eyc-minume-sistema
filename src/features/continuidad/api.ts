import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { datos } from '@/lib/consulta'
import type { Estatus } from '@/lib/tipos'

export function useCasos(filtro: { personaId?: string; soloPendientes?: boolean } = {}) {
  return useQuery({
    queryKey: ['casos', filtro],
    queryFn: async () => {
      let q = supabase.from('v_casos').select('*').order('recomendacion_fecha', { ascending: false })
      if (filtro.personaId) q = q.eq('persona_id', filtro.personaId)
      if (filtro.soloPendientes) q = q.eq('pendiente', true)
      return datos(await q)
    },
  })
}

export function useContinuidad(personaId: string | undefined) {
  return useQuery({
    queryKey: ['casos', 'continuidad', personaId],
    enabled: !!personaId,
    queryFn: async () => datos(await supabase.from('v_continuidad_actual').select('*').eq('persona_id', personaId!).maybeSingle()),
  })
}

function useInvalidarTodo() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}

export function useRegistrarRecomendacion() {
  const inv = useInvalidarTodo()
  return useMutation({
    mutationFn: async (p: { personaId: string; corteId: number; recomendacion: Estatus; comentario: string }) =>
      datos(
        await supabase.rpc('registrar_recomendacion', {
          p_persona: p.personaId,
          p_corte: p.corteId,
          p_recomendacion: p.recomendacion,
          p_comentario: p.comentario,
        }),
      ),
    onSuccess: inv,
  })
}

/** Decisión (y, si corresponde, sustitución) en una sola transacción en la base. */
export function useDecidir() {
  const inv = useInvalidarTodo()
  return useMutation({
    mutationFn: async (p: { recomendacionId: string; decision: Estatus; comentario: string; sustitucion?: { persona_id?: string; nombre?: string; correo?: string } }) =>
      datos(
        await supabase.rpc('decidir', {
          p_recomendacion: p.recomendacionId,
          p_decision: p.decision,
          p_comentario: p.comentario,
          ...(p.sustitucion ? { p_sustitucion: p.sustitucion } : {}),
        }),
      ),
    onSuccess: inv,
  })
}

/** Sustitución posterior a una decisión de sustitución ya tomada. */
export function useSustituir() {
  const inv = useInvalidarTodo()
  return useMutation({
    mutationFn: async (p: { salienteId: string; entrante: { persona_id?: string; nombre?: string; correo?: string }; nota?: string }) =>
      datos(await supabase.rpc('sustituir', { p_saliente: p.salienteId, p_entrante: p.entrante, ...(p.nota ? { p_nota: p.nota } : {}) })),
    onSuccess: inv,
  })
}
