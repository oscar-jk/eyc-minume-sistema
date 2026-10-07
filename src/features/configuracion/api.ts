import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { datos } from '@/lib/consulta'
import type { Ambito, EstadoFase, Rol, Tabla } from '@/lib/tipos'

const LARGO = 5 * 60_000

// ───────────── Lecturas ─────────────
export function useFases() {
  return useQuery({
    queryKey: ['fases'],
    queryFn: async () => datos(await supabase.from('fases').select('*').order('orden')),
    staleTime: 60_000,
  })
}

export function useCortes() {
  return useQuery({
    queryKey: ['cortes'],
    queryFn: async () => datos(await supabase.from('cortes').select('*').order('orden')),
    staleTime: LARGO,
  })
}

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const filas = datos(await supabase.from('config').select('*'))
      return Object.fromEntries(filas.map((f) => [f.clave, f])) as Record<string, Tabla<'config'>>
    },
    staleTime: LARGO,
  })
}

export function useContexto() {
  return useQuery({
    queryKey: ['contexto'],
    queryFn: async () => datos(await supabase.rpc('contexto_actual'))[0] ?? null,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useDimensiones() {
  return useQuery({
    queryKey: ['dimensiones'],
    queryFn: async () => datos(await supabase.from('dimensiones').select('*').order('orden')),
    staleTime: LARGO,
  })
}

export function useCriterios(ambito?: Ambito) {
  return useQuery({
    queryKey: ['criterios', ambito ?? 'todos'],
    queryFn: async () => {
      let q = supabase.from('criterios').select('*').order('dimension_id').order('orden')
      if (ambito) q = q.eq('ambito', ambito)
      return datos(await q)
    },
    staleTime: LARGO,
  })
}

export function useHistorialCriterio(id: number | null) {
  return useQuery({
    queryKey: ['criterio-historial', id],
    enabled: id != null,
    queryFn: async () => datos(await supabase.from('criterios_historial').select('*').eq('criterio_id', id!).order('version', { ascending: false })),
  })
}

export function usePesos() {
  return useQuery({
    queryKey: ['pesos'],
    queryFn: async () => datos(await supabase.from('pesos_dimension').select('*')),
    staleTime: LARGO,
  })
}

export function useValidezPesos() {
  return useQuery({
    queryKey: ['pesos-validez'],
    queryFn: async () => {
      const [amb, cor] = await Promise.all([supabase.from('v_pesos_ambito').select('*'), supabase.from('v_pesos_cortes').select('*').single()])
      return { ambitos: datos(amb), cortes: datos(cor) }
    },
    staleTime: 60_000,
  })
}

/** Cuántas evaluaciones completas cambiarían si se modifican los pesos de un ámbito. */
export async function contarCompletas(ambito?: Ambito): Promise<number> {
  let q = supabase.from('evaluaciones').select('id', { count: 'exact', head: true }).eq('estado', 'completa')
  if (ambito) q = q.eq('ambito', ambito)
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

export function usePerfiles(habilitado = true) {
  return useQuery({
    queryKey: ['perfiles'],
    enabled: habilitado,
    queryFn: async () => datos(await supabase.from('perfiles').select('*').order('nombre')),
  })
}

export function useAuditoria(tabla?: string) {
  return useQuery({
    queryKey: ['auditoria', tabla ?? 'todas'],
    queryFn: async () => {
      let q = supabase.from('auditoria').select('*').order('fecha', { ascending: false }).limit(100)
      if (tabla) q = q.eq('tabla', tabla)
      return datos(await q)
    },
  })
}

// ───────────── Escrituras ─────────────
function useInvalidar(...claves: string[][]) {
  const qc = useQueryClient()
  return () => Promise.all(claves.map((k) => qc.invalidateQueries({ queryKey: k })))
}

const CALCULOS = [['pesos'], ['pesos-validez'], ['cortes'], ['monitoreo'], ['puntajes'], ['evaluaciones'], ['ficha']]

export function useActualizarFase() {
  const inv = useInvalidar(['fases'], ['contexto'], ['cobertura'])
  return useMutation({
    mutationFn: async (p: { id: number; estado?: EstadoFase; inicio?: string | null; fin?: string | null; permite_rotacion?: boolean }) => {
      const { id, ...cambios } = p
      datos(await supabase.from('fases').update(cambios).eq('id', id).select().single())
    },
    onSuccess: inv,
  })
}

export function useGuardarPesos() {
  const inv = useInvalidar(...CALCULOS)
  return useMutation({
    mutationFn: async (p: { ambito: Ambito; pesos: Record<number, number> }) => {
      datos(await supabase.rpc('guardar_pesos', { p_ambito: p.ambito, p_pesos: p.pesos }))
    },
    onSuccess: inv,
  })
}

export function useGuardarCortes() {
  const inv = useInvalidar(...CALCULOS)
  return useMutation({
    mutationFn: async (cortes: { id: number; peso: number; umbral_verde: number; umbral_amarillo: number }[]) => {
      datos(await supabase.rpc('guardar_cortes', { p_cortes: cortes }))
    },
    onSuccess: inv,
  })
}

export function useGuardarCriterio() {
  const inv = useInvalidar(['criterios'], ['criterio-historial'])
  return useMutation({
    mutationFn: async (c: Partial<Tabla<'criterios'>> & { id?: number }) => {
      if (c.id) {
        const { id, texto, favorable, activo, orden } = c
        datos(await supabase.from('criterios').update({ texto, favorable, activo, orden }).eq('id', id).select().single())
      } else {
        datos(
          await supabase
            .from('criterios')
            .insert({
              ambito: c.ambito!,
              dimension_id: c.dimension_id!,
              codigo: c.codigo!,
              texto: c.texto!,
              favorable: c.favorable!,
              orden: c.orden ?? 99,
            })
            .select()
            .single(),
        )
      }
    },
    onSuccess: inv,
  })
}

export function useActualizarConfig() {
  const inv = useInvalidar(['config'], ['contexto'], ...CALCULOS)
  return useMutation({
    mutationFn: async (p: { clave: string; valor: unknown; provisional?: boolean }) => {
      datos(
        await supabase
          .from('config')
          .update({ valor: p.valor as never, ...(p.provisional !== undefined ? { provisional: p.provisional } : {}) })
          .eq('clave', p.clave)
          .select()
          .single(),
      )
    },
    onSuccess: inv,
  })
}

export function useReprogramarEvento() {
  const inv = useInvalidar(['config'], ['fases'], ['contexto'])
  return useMutation({
    mutationFn: async (p: { inicio: string; dias: number }) => {
      datos(await supabase.rpc('reprogramar_evento', { p_inicio: p.inicio, p_dias: p.dias }))
    },
    onSuccess: inv,
  })
}

// ───────────── Cuentas (Edge Function con llave de servicio en el servidor) ─────────────
async function invocar<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', {
    body: { ...body, redirect_to: `${window.location.origin}/nueva-contrasena` },
  })
  if (error) {
    const ctx = (error as { context?: Response }).context
    const detalle = ctx ? await ctx.json().catch(() => null) : null
    throw new Error(detalle?.error ?? error.message)
  }
  return data as T
}

export function useCrearCuenta() {
  const inv = useInvalidar(['perfiles'])
  return useMutation({
    mutationFn: (p: { email: string; nombre: string; rol: Rol; comision_id?: number | null; persona_id?: string | null }) =>
      invocar<{ user_id: string; enlace: string }>({ accion: 'crear', ...p }),
    onSuccess: inv,
  })
}

export function useEnlaceAcceso() {
  return useMutation({ mutationFn: (email: string) => invocar<{ enlace: string }>({ accion: 'enlace', email }) })
}

export function useActivarCuenta() {
  const inv = useInvalidar(['perfiles'])
  return useMutation({
    mutationFn: (p: { user_id: string; activo: boolean }) => invocar<{ ok: true }>({ accion: 'activar', ...p }),
    onSuccess: inv,
  })
}

export function useActualizarPerfil() {
  const inv = useInvalidar(['perfiles'], ['perfil'])
  return useMutation({
    mutationFn: async (p: { id: string; nombre?: string; rol?: Rol | null; comision_id?: number | null; persona_id?: string | null }) => {
      const { id, ...cambios } = p
      datos(await supabase.from('perfiles').update(cambios).eq('id', id).select().single())
    },
    onSuccess: inv,
  })
}
