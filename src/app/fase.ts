import { useConfig, useContexto, useCortes, useFases } from '@/features/configuracion/api'
import type { Fase } from '@/lib/tipos'

/** Fase de referencia: la primera abierta; si no hay, la última cerrada; si no, la primera pendiente. */
export function faseVigente(fases: Fase[]): Fase | null {
  const abiertas = fases.filter((f) => f.estado === 'abierta')
  if (abiertas.length) return abiertas[0]
  const cerradas = fases.filter((f) => f.estado === 'cerrada')
  if (cerradas.length) return cerradas[cerradas.length - 1]
  return fases[0] ?? null
}

/** Estado temporal compartido por todas las vistas: fases, corte activo, día del evento. */
export function useMomento() {
  const fases = useFases()
  const cortes = useCortes()
  const ctx = useContexto()
  const config = useConfig()
  const lista = fases.data ?? []
  const abiertas = lista.filter((f) => f.estado === 'abierta')
  const vigente = faseVigente(lista)
  const corteActivo = cortes.data?.find((c) => c.id === vigente?.corte_id) ?? cortes.data?.[0] ?? null
  const faseEvaluacionAbierta = abiertas.find((f) => f.tipo === 'evaluacion') ?? null
  return {
    cargando: fases.isPending || cortes.isPending || ctx.isPending,
    error: fases.error ?? cortes.error ?? ctx.error,
    fases: lista,
    cortes: cortes.data ?? [],
    abiertas,
    vigente,
    corteActivo,
    faseEvaluacionAbierta,
    hoy: ctx.data?.hoy ?? null,
    diaEvento: ctx.data?.dia_evento ?? null,
    diasEvento: ctx.data?.evento_dias ?? null,
    config: config.data ?? {},
  }
}
