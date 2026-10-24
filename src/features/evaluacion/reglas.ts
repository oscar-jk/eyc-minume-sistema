import type { Criterio, Respuesta } from '@/lib/tipos'

/** ¿Es un criterio con nota (0 hasta sus puntos) en lugar de Sí/No? */
export const esDeNota = (c: { tipo?: string }) => c.tipo === 'nota'

/**
 * Desfavorable = respuesta contraria a la favorable del criterio (N/O nunca lo es).
 * Solo guía la interfaz (pedir el comentario a tiempo); la base valida lo mismo al completar.
 */
export function esDesfavorable(c: Pick<Criterio, 'favorable'> & { tipo?: string }, r?: Respuesta) {
  return !esDeNota(c) && !!r && r !== 'no_observado' && r !== c.favorable
}

/**
 * ¿Este criterio exige comentario/descripción ahora?
 * - Sí/No: solo si la respuesta es desfavorable.
 * - Nota: SIEMPRE que tenga respuesta, incluso N/A (toda nota se justifica).
 */
export function exigeComentario(c: Pick<Criterio, 'favorable'> & { tipo?: string }, r?: Respuesta) {
  return esDeNota(c) ? !!r : esDesfavorable(c, r)
}

/** Secciones en el orden en que aparecen; las dimensiones sin sección van juntas al final. */
export function agruparPorSeccion<T extends { seccion: string | null }>(items: T[]): { seccion: string | null; items: T[] }[] {
  const grupos: { seccion: string | null; items: T[] }[] = []
  for (const it of items) {
    const g = grupos.find((x) => x.seccion === it.seccion)
    if (g) g.items.push(it)
    else grupos.push({ seccion: it.seccion, items: [it] })
  }
  return grupos
}
