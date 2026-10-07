import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { datos } from '@/lib/consulta'
import type { Respuesta } from '@/lib/tipos'

export interface FiltroEvaluaciones {
  personaId?: string
  comisionId?: number
  actividadId?: string
  ambito?: 'mesa' | 'eyc'
  personas?: string[]
}

/** Listado con puntajes ya calculados por la base (v_evaluaciones). */
export function useEvaluaciones(f: FiltroEvaluaciones, habilitado = true) {
  return useQuery({
    queryKey: ['evaluaciones', f],
    enabled: habilitado,
    queryFn: async () => {
      let q = supabase.from('v_evaluaciones').select('*').order('fecha', { ascending: false }).order('persona_nombre')
      if (f.personaId) q = q.eq('persona_id', f.personaId)
      if (f.comisionId) q = q.eq('comision_id', f.comisionId)
      if (f.actividadId) q = q.eq('actividad_id', f.actividadId)
      if (f.ambito) q = q.eq('ambito', f.ambito)
      if (f.personas) q = q.in('persona_id', f.personas)
      return datos(await q)
    },
  })
}

/** Una evaluación con sus respuestas, dimensiones N/O, puntos por dimensión y faltantes (todo desde la base). */
export function useEvaluacion(id: string | undefined) {
  return useQuery({
    queryKey: ['evaluaciones', 'detalle', id],
    enabled: !!id,
    queryFn: async () => {
      const [cab, resp, dims, puntos, falt] = await Promise.all([
        supabase.from('v_evaluaciones').select('*').eq('evaluacion_id', id!).single(),
        supabase.from('respuestas').select('*').eq('evaluacion_id', id!),
        supabase.from('evaluacion_dimensiones').select('*').eq('evaluacion_id', id!),
        supabase.from('v_evaluacion_dimension').select('*').eq('evaluacion_id', id!),
        supabase.rpc('faltantes_evaluacion', { p_evaluacion: id! }),
      ])
      return {
        cabecera: datos(cab),
        respuestas: datos(resp),
        dimensiones: datos(dims),
        puntos: datos(puntos),
        faltantes: datos(falt),
      }
    },
  })
}

/** Evaluación existente de una persona para una actividad o jornada (para no duplicar). */
export async function buscarExistente(personaId: string, ref: { actividadId?: string; fecha?: string }) {
  let q = supabase.from('evaluaciones').select('id').eq('persona_id', personaId)
  q = ref.actividadId ? q.eq('actividad_id', ref.actividadId) : q.eq('fecha_jornada', ref.fecha!)
  const r = datos(await q.maybeSingle())
  return r?.id ?? null
}

/** Lo que falta para completar, según la base (fuente de verdad de la validación). */
export async function obtenerFaltantes(id: string) {
  return datos(await supabase.rpc('faltantes_evaluacion', { p_evaluacion: id }))
}

export interface RespuestaForm {
  criterio_id: number
  respuesta: Respuesta
  comentario: string
}

export interface GuardarEvaluacion {
  id?: string
  persona_id: string
  actividad_id?: string
  fecha_jornada?: string
  comentario_general?: string
  estado: 'borrador' | 'completa'
  respuestas: RespuestaForm[]
  dimensiones_no_observadas: number[]
}

/** Guardado atómico vía RPC: la base fija fase, corte, asignación y valida la completitud. */
export function useGuardarEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: GuardarEvaluacion) => datos(await supabase.rpc('guardar_evaluacion', { p: p as never })),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['evaluaciones'] }),
        qc.invalidateQueries({ queryKey: ['asignaciones', 'jornada'] }),
        qc.invalidateQueries({ queryKey: ['monitoreo'] }),
        qc.invalidateQueries({ queryKey: ['puntajes'] }),
        qc.invalidateQueries({ queryKey: ['cobertura'] }),
      ]),
  })
}

export function useBorrarEvaluacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('evaluaciones').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluaciones'] }),
  })
}
