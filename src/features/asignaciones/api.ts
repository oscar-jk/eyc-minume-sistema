import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { datos } from '@/lib/consulta'
import type { MotivoAsignacion } from '@/lib/tipos'

export function useVigentes(comisionId?: number | null) {
  return useQuery({
    queryKey: ['asignaciones', 'vigentes', comisionId ?? 'todas'],
    queryFn: async () => {
      let q = supabase.from('v_asignaciones_vigentes').select('*').order('comision_id').order('cargo_orden')
      if (comisionId) q = q.eq('comision_id', comisionId)
      return datos(await q)
    },
  })
}

/** Historial completo de una persona (todas las comisiones por las que pasó). */
export function useHistorialPersona(personaId: string | undefined) {
  return useQuery({
    queryKey: ['asignaciones', 'persona', personaId],
    enabled: !!personaId,
    queryFn: async () =>
      datos(
        await supabase
          .from('asignaciones')
          .select('*, comision:comisiones(sigla, clave, nombre), cargo:cargos(nombre)')
          .eq('persona_id', personaId!)
          .order('desde', { ascending: false }),
      ),
  })
}

/** Historial de una comisión: quiénes han ocupado cada cargo. */
export function useHistorialComision(comisionId: number | undefined) {
  return useQuery({
    queryKey: ['asignaciones', 'comision', comisionId],
    enabled: !!comisionId,
    queryFn: async () =>
      datos(
        await supabase
          .from('asignaciones')
          .select('*, persona:personas(nombre, activa), cargo:cargos(nombre, orden)')
          .eq('comision_id', comisionId!)
          .order('desde', { ascending: false }),
      ),
  })
}

/** Quién estuvo asignado a la comisión en una jornada y el estado de su evaluación de ese día. */
export function useAsignadosEn(comisionId: number | undefined, fecha: string | undefined) {
  return useQuery({
    queryKey: ['asignaciones', 'jornada', comisionId, fecha],
    enabled: !!comisionId && !!fecha,
    queryFn: async () => datos(await supabase.rpc('asignados_en', { p_comision: comisionId!, p_fecha: fecha! })),
  })
}

export interface Movimiento {
  persona_id: string
  comision_id: number | null
  cargo_id: number | null
}

/** Rotación, ajuste o asignación inicial: varios movimientos en una sola transacción. */
export function useMoverAsignaciones() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { movimientos: Movimiento[]; motivo: MotivoAsignacion; desde?: string; nota?: string }) =>
      datos(
        await supabase.rpc('mover_asignaciones', {
          p_movs: p.movimientos as never,
          p_motivo: p.motivo,
          ...(p.desde ? { p_desde: p.desde } : {}),
          ...(p.nota ? { p_nota: p.nota } : {}),
        }),
      ),
    onSuccess: () => qc.invalidateQueries(),
  })
}
