/**
 * Errores para personas, no para desarrolladores.
 * - El usuario ve un mensaje amable y qué puede hacer.
 * - Nosotros recibimos un código de referencia (EYC-…) y el detalle técnico en la consola,
 *   así cuando alguien reporta «me salió EYC-PERM-42501» sabemos exactamente qué fue.
 */

export interface ErrorAmigable {
  /** Mensaje para el usuario, en lenguaje claro. */
  mensaje: string
  /** Qué puede hacer la persona. */
  sugerencia?: string
  /** Código de referencia para soporte. */
  codigo: string
}

interface ErrorCrudo {
  message?: string
  code?: string
  hint?: string
  details?: string
  status?: number
}

const crudo = (e: unknown): ErrorCrudo => (typeof e === 'object' && e ? (e as ErrorCrudo) : { message: String(e) })

/** Mensajes de nuestras reglas de negocio (ya vienen en español desde la base): se muestran tal cual, sin el ruido técnico. */
function esReglaDelSistema(err: ErrorCrudo) {
  return err.code === 'P0001' || (err.code === '42501' && !/permission denied|row-level security/i.test(err.message ?? ''))
}

export function interpretarError(e: unknown): ErrorAmigable {
  const err = crudo(e)
  const msg = (err.message ?? '').trim()
  const pg = err.code ?? ''

  if (/Failed to fetch|NetworkError|network|Load failed/i.test(msg))
    return { mensaje: 'No pudimos conectarnos con el servidor.', sugerencia: 'Revisa tu conexión a internet e inténtalo de nuevo.', codigo: 'EYC-RED' }
  if (/JWT expired|invalid JWT|refresh token/i.test(msg))
    return { mensaje: 'Tu sesión expiró.', sugerencia: 'Vuelve a iniciar sesión para continuar.', codigo: 'EYC-SESION' }
  if (/Invalid login credentials/i.test(msg))
    return { mensaje: 'El correo o la contraseña no coinciden.', sugerencia: 'Revísalos o usa «¿Olvidaste tu contraseña?».', codigo: 'EYC-LOGIN' }
  if (/Email not confirmed/i.test(msg)) return { mensaje: 'Tu cuenta aún no está confirmada.', sugerencia: 'Pide un enlace de acceso a la administración.', codigo: 'EYC-LOGIN-CONF' }
  if (/rate limit|too many/i.test(msg)) return { mensaje: 'Hiciste demasiados intentos seguidos.', sugerencia: 'Espera un minuto y vuelve a intentarlo.', codigo: 'EYC-LIMITE' }
  if (err.hint === 'fase_no_abierta' || /no se puede escribir/i.test(msg))
    return { mensaje: msg || 'Esta fase no está abierta.', sugerencia: 'La Subsecretaría debe abrir la fase para poder registrar cambios.', codigo: 'EYC-FASE' }
  if (err.hint === 'evaluacion_incompleta')
    return { mensaje: 'A la evaluación le faltan datos para marcarla completa.', sugerencia: 'Revisa la lista de pendientes arriba del formulario.', codigo: 'EYC-INCOMPLETA' }
  if (pg === '42501' && /permission denied|row-level security/i.test(msg))
    return { mensaje: 'Tu rol no tiene permiso para esta acción.', sugerencia: 'Si crees que deberías poder hacerlo, contacta a la administración.', codigo: 'EYC-PERM-42501' }
  if (pg === '23505') return { mensaje: 'Ese registro ya existe.', sugerencia: 'Busca el existente y edítalo en lugar de crearlo de nuevo.', codigo: 'EYC-DUP-23505' }
  if (pg === '23503') return { mensaje: 'Este dato está en uso por otros registros y no se puede quitar.', codigo: 'EYC-REF-23503' }
  if (pg === '23514' || pg === '22P02' || pg === '22007')
    return { mensaje: 'Algún dato no tiene el formato esperado.', sugerencia: 'Revisa los campos marcados e inténtalo de nuevo.', codigo: `EYC-DATO-${pg}` }
  if (pg === '23P01') return { mensaje: 'Ese cargo ya está ocupado en ese período.', sugerencia: 'Usa «Mover» con la opción «Intercambiar».', codigo: 'EYC-SOLAPE' }
  if (esReglaDelSistema(err) && msg) return { mensaje: msg.replace(/^ERROR:\s*/i, ''), codigo: `EYC-REGLA${pg ? '-' + pg : ''}` }
  if (pg === 'PGRST116') return { mensaje: 'No encontramos ese registro, o no tienes acceso a él.', codigo: 'EYC-NOEXISTE' }

  return {
    mensaje: 'Algo no salió como esperábamos.',
    sugerencia: 'Inténtalo de nuevo. Si se repite, comparte el código con la administración.',
    codigo: `EYC-X${pg ? '-' + pg : ''}-${Math.abs(hash(msg)).toString(36).slice(0, 5).toUpperCase()}`,
  }
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

/** Registra el detalle técnico (para nosotros) y devuelve la versión amable. */
export function reportarError(e: unknown, contexto = ''): ErrorAmigable {
  const a = interpretarError(e)
  console.error(`[${a.codigo}]${contexto ? ' ' + contexto : ''}`, e)
  return a
}

/** Texto de una línea para avisos breves: mensaje + código. */
export function mensajeError(e: unknown): string {
  const a = reportarError(e)
  return `${a.mensaje}${a.sugerencia ? ' ' + a.sugerencia : ''} (${a.codigo})`
}

export function esFaseCerrada(e: unknown): boolean {
  const err = crudo(e)
  return err?.hint === 'fase_no_abierta' || /no se puede escribir/i.test(err?.message ?? '')
}
