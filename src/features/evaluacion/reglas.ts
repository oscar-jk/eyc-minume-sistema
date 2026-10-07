import type { Criterio, Respuesta } from '@/lib/tipos'

/**
 * Desfavorable = respuesta contraria a la favorable del criterio (N/O nunca lo es).
 * Solo guía la interfaz (pedir el comentario a tiempo); la base valida lo mismo al completar.
 */
export function esDesfavorable(c: Pick<Criterio, 'favorable'>, r?: Respuesta) {
  return !!r && r !== 'no_observado' && r !== c.favorable
}
