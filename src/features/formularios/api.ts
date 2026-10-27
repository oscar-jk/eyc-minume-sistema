import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { datos } from '@/lib/consulta'
import { opcionesDe, type CampoBorrador, type FormularioPublicoDef, type PersonaComision, type TipoCampo, type Valores } from './tipos'

// ───────────── Formularios de la cuenta (con sesión) ─────────────

export function useFormularios() {
  return useQuery({
    queryKey: ['formularios'],
    queryFn: async () => {
      const [f, e] = await Promise.all([
        supabase.from('formularios').select('*').order('creado_en', { ascending: false }),
        supabase.from('formulario_envios').select('formulario_id'),
      ])
      const conteo = new Map<string, number>()
      for (const x of datos(e)) conteo.set(x.formulario_id, (conteo.get(x.formulario_id) ?? 0) + 1)
      return datos(f).map((x) => ({ ...x, envios: conteo.get(x.id) ?? 0 }))
    },
  })
}

export function useFormulario(id: string | undefined) {
  return useQuery({
    queryKey: ['formularios', 'detalle', id],
    enabled: !!id,
    queryFn: async () => {
      const [f, c] = await Promise.all([
        supabase.from('formularios').select('*').eq('id', id!).single(),
        supabase.from('formulario_campos').select('*').eq('formulario_id', id!).order('orden').order('creado_en'),
      ])
      return { formulario: datos(f), campos: datos(c) }
    },
  })
}

export function useCrearFormulario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { titulo: string }) => datos(await supabase.from('formularios').insert({ titulo: p.titulo.trim() }).select('id').single()).id,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formularios'] }),
  })
}

export interface CambiosFormulario {
  id: string
  titulo: string
  descripcion: string
  roles: string[]
  pide_comision: boolean
  pide_referencia: boolean
  comision_fija: number | null
  activo: boolean
  campos: CampoBorrador[]
  /** Ids de campos que existían y ya no están en el borrador. */
  quitados: string[]
}

/** Guarda el formulario y sus campos. Un campo con respuestas no se borra: se desactiva. */
export function useGuardarFormulario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: CambiosFormulario) => {
      datos(
        await supabase
          .from('formularios')
          .update({
            titulo: p.titulo.trim(),
            descripcion: p.descripcion.trim() || null,
            roles: p.roles,
            pide_comision: p.pide_comision,
            comision_fija: p.pide_comision ? p.comision_fija : null,
            pide_referencia: p.pide_referencia,
            activo: p.activo,
          })
          .eq('id', p.id)
          .select('id')
          .single(),
      )
      for (const id of p.quitados) {
        const { error } = await supabase.from('formulario_campos').delete().eq('id', id)
        if (error) {
          // Con respuestas: se conserva y se oculta.
          if (error.code === '23001' || error.code === '23503') datos(await supabase.from('formulario_campos').update({ activo: false }).eq('id', id).select('id').single())
          else throw error
        }
      }
      for (const [i, c] of p.campos.entries()) {
        const fila = {
          orden: i + 1,
          tipo: c.tipo,
          etiqueta: c.etiqueta.trim(),
          ayuda: c.ayuda.trim() || null,
          obligatorio: c.obligatorio,
          opciones: c.opcionesTexto.split('\n').map((x) => x.trim()).filter(Boolean),
          escala_min: c.tipo === 'escala' ? c.escala_min : null,
          escala_max: c.tipo === 'escala' ? c.escala_max : null,
          roles: c.roles,
          activo: true,
        }
        if (c.id) datos(await supabase.from('formulario_campos').update(fila).eq('id', c.id).select('id').single())
        else datos(await supabase.from('formulario_campos').insert({ ...fila, formulario_id: p.id }).select('id').single())
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formularios'] }),
  })
}

/** Copia un formulario (datos y preguntas) a uno nuevo, cerrado y sin respuestas. Devuelve el id de la copia. */
export function useDuplicarFormulario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { id: string; titulo?: string }) => datos(await supabase.rpc('duplicar_formulario', { p_id: p.id, p_titulo: p.titulo })) as string,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formularios'] }),
  })
}

export function useActivarFormulario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { id: string; activo: boolean }) => datos(await supabase.from('formularios').update({ activo: p.activo }).eq('id', p.id).select('id').single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formularios'] }),
  })
}

export function useBorrarFormulario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('eliminar_formulario', { p_id: id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formularios'] }),
  })
}

// ───────────── Resultados ─────────────

export interface ResumenCampo {
  campo_id: string
  etiqueta: string
  tipo: TipoCampo
  activo: boolean
  respuestas: number
  resumen: Record<string, unknown>
}
export interface Resultados {
  envios: number
  por_rol: Record<string, number>
  campos: ResumenCampo[]
}

export function useResultados(id: string | undefined) {
  return useQuery({
    queryKey: ['formularios', 'resultados', id],
    enabled: !!id,
    queryFn: async () => datos(await supabase.rpc('formulario_resultados', { p_formulario: id! })) as unknown as Resultados,
  })
}

/** Respuestas una por una (para la tabla y la descarga). */
export function useEnviosFormulario(id: string | undefined) {
  return useQuery({
    queryKey: ['formularios', 'envios', id],
    enabled: !!id,
    queryFn: async () => {
      const envios = datos(
        await supabase.from('formulario_envios').select('id, rol, comision_id, referencia, creado_en').eq('formulario_id', id!).order('creado_en', { ascending: false }).limit(2000),
      )
      const porEnvio = new Map<string, Record<string, unknown>>()
      // Por tandas, para no pasarse del largo de la dirección.
      for (let i = 0; i < envios.length; i += 150) {
        const ids = envios.slice(i, i + 150).map((x) => x.id)
        for (const x of datos(await supabase.from('formulario_respuestas').select('envio_id, campo_id, valor').in('envio_id', ids))) {
          porEnvio.set(x.envio_id, { ...(porEnvio.get(x.envio_id) ?? {}), [x.campo_id]: x.valor })
        }
      }
      return envios.map((x) => ({ ...x, respuestas: porEnvio.get(x.id) ?? {} }))
    },
  })
}

// ───────────── Página pública (sin cuenta) ─────────────

export function useFormularioPublico(codigo: string | undefined) {
  return useQuery({
    queryKey: ['formulario-publico', codigo],
    enabled: !!codigo,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const d = datos(await supabase.rpc('formulario_publico', { p_codigo: codigo! })) as unknown as FormularioPublicoDef
      return { ...d, campos: d.campos.map((c) => ({ ...c, opciones: opcionesDe(c.opciones) })) }
    },
  })
}

/** Personas registradas en la comisión elegida (solo nombre y cargo), para el campo «personas». */
export function useFormularioPersonas(codigo: string | undefined, comisionId: number | null, activo: boolean) {
  return useQuery({
    queryKey: ['formulario-personas', codigo, comisionId],
    enabled: !!codigo && comisionId != null && activo,
    staleTime: 60_000,
    queryFn: async () => (datos(await supabase.rpc('formulario_personas', { p_codigo: codigo!, p_comision: comisionId! })) as unknown as PersonaComision[]),
  })
}

export function useEnviarFormulario(codigo: string) {
  return useMutation({
    mutationFn: async (p: { rol: string | null; comision_id: number | null; referencia: string; respuestas: Valores; web: string }) => {
      const limpio = Object.fromEntries(Object.entries(p.respuestas).filter(([, v]) => v !== undefined))
      datos(await supabase.rpc('formulario_enviar', { p_codigo: codigo, p: { ...p, respuestas: limpio } as never }))
    },
  })
}
