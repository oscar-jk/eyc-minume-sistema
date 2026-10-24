import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { datos } from '@/lib/consulta'
import type { Ambito } from '@/lib/tipos'

export function usePersonas() {
  return useQuery({
    queryKey: ['personas'],
    queryFn: async () => datos(await supabase.from('personas').select('*').order('nombre')),
  })
}

export function usePersona(id: string | undefined) {
  return useQuery({
    queryKey: ['ficha', 'persona', id],
    enabled: !!id,
    queryFn: async () => datos(await supabase.from('personas').select('*, comision_origen:comisiones(sigla, clave, nombre), cargo_base:cargos(nombre)').eq('id', id!).maybeSingle()),
  })
}

export interface AltaPersona {
  nombre: string
  ambito: Ambito
  comision_id?: number | null
  cargo_id?: number | null
  correo?: string | null
}

/** Alta atómica de una o varias personas, con su asignación inicial si se indica. */
export function useAltaPersonas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { personas: AltaPersona[]; desde?: string }) =>
      datos(await supabase.rpc('alta_personas', { p: p.personas as never, ...(p.desde ? { p_desde: p.desde } : {}) })),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useEditarPersona() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { id: string; nombre?: string; correo?: string | null; notas?: string | null }) => {
      const { id, ...cambios } = p
      datos(await supabase.from('personas').update(cambios).eq('id', id).select().single())
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

// ───────────── Calificación inicial (examen 50 % · institucional 30 % · pares 20 %) ─────────────

/** Una fila por miembro de mesa: examen y pares capturados, institucional (Corte 1) y total, todo calculado por la base. */
export function useCalificacionInicial() {
  return useQuery({
    queryKey: ['calificacion-inicial'],
    queryFn: async () => datos(await supabase.from('v_calificacion_inicial').select('*').order('nombre')),
  })
}

export interface NotaInicial {
  persona_id: string
  examen: number | null
  pares: number | null
}

/** Guarda varias personas a la vez (alta o cambio). */
export function useGuardarCalificacionInicial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (filas: NotaInicial[]) => {
      datos(await supabase.from('calificacion_inicial').upsert(filas, { onConflict: 'persona_id' }).select('persona_id'))
    },
    onSuccess: () =>
      Promise.all([qc.invalidateQueries({ queryKey: ['calificacion-inicial'] }), qc.invalidateQueries({ queryKey: ['puntuacion-rotacion'] })]),
  })
}
