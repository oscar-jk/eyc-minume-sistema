import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { datos } from '@/lib/consulta'

/** Puntaje por corte y puntaje final de una persona (calculados en la base). */
export function usePuntajesPersona(personaId: string | undefined) {
  return useQuery({
    queryKey: ['puntajes', personaId],
    enabled: !!personaId,
    queryFn: async () => {
      const [cortes, final] = await Promise.all([
        supabase.from('v_puntaje_corte').select('*').eq('persona_id', personaId!).order('corte_id'),
        supabase.from('v_puntaje_final').select('*').eq('persona_id', personaId!).maybeSingle(),
      ])
      return { cortes: datos(cortes), final: datos(final) }
    },
  })
}
