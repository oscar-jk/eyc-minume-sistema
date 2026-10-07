import type { Ambito, EstadoFase, Estatus, MotivoAsignacion, Rol, Semaforo, TipoActividad } from './tipos'

/** Etiquetas de interfaz. Los valores calculados nunca se derivan aquí: vienen de la base. */
export const ROL: Record<Rol, string> = {
  eyc: 'Evaluación y Control',
  subsecretario: 'Subsecretaría de Planificación y Desarrollo',
  secretario: 'Secretaría General',
  admin: 'Administración',
}

export const AMBITO: Record<Ambito, string> = { mesa: 'Mesa directiva', eyc: 'Miembro de EyC' }

export const SEMAFORO: Record<Semaforo, { etiqueta: string; significado: string }> = {
  verde: { etiqueta: 'Cumple', significado: 'Desempeño sólido o superior' },
  amarillo: { etiqueta: 'Seguimiento', significado: 'Cumple lo esencial, requiere acompañamiento' },
  rojo: { etiqueta: 'En riesgo', significado: 'No alcanza el estándar mínimo' },
  gris: { etiqueta: 'No evaluado', significado: 'Sin evaluaciones completas en este corte' },
}

export const ESTATUS: Record<Estatus, string> = {
  continua: 'Continúa',
  seguimiento: 'Seguimiento',
  sustitucion: 'Sustitución',
  no_evaluado: 'No evaluado',
}

export const ESTADO_FASE: Record<EstadoFase, string> = { pendiente: 'Pendiente', abierta: 'Abierta', cerrada: 'Cerrada' }

export const MOTIVO: Record<MotivoAsignacion, string> = {
  inicial: 'Asignación inicial',
  rotacion: 'Rotación',
  sustitucion: 'Sustitución',
  ajuste: 'Ajuste',
}

export const TIPO_ACTIVIDAD: Record<TipoActividad, string> = {
  taller: 'Taller',
  capacitacion: 'Capacitación',
  reunion: 'Reunión',
  otra: 'Otra',
}

const fmtFecha = new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const fmtFechaCorta = new Intl.DateTimeFormat('es-DO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const fmtFechaHora = new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/** Fecha "YYYY-MM-DD" (sin hora) → texto, sin corrimiento de zona. */
export function fecha(iso: string | null | undefined, corta = false): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)
  return (corta ? fmtFechaCorta : fmtFecha).format(d)
}

export function fechaHora(iso: string | null | undefined): string {
  return iso ? fmtFechaHora.format(new Date(iso)) : '—'
}

/** Puntaje ya calculado por la base → texto. null nunca se muestra como 0. */
export function puntaje(v: number | null | undefined): string {
  return v == null ? '—' : v.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
}

export function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`
}

/** Suma de pesos para validación en vivo del formulario (no es un cálculo de puntaje). */
export function suma(valores: number[]): number {
  return Math.round(valores.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) * 100) / 100
}
