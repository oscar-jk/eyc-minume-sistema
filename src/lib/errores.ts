/** Traduce errores de Supabase/Postgres a mensajes útiles. Los mensajes de nuestras reglas ya vienen en español. */
export function mensajeError(e: unknown): string {
  if (!e) return 'Error desconocido.'
  const err = e as { message?: string; code?: string; details?: string }
  const msg = err.message ?? String(e)
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
  if (/JWT expired|invalid JWT/i.test(msg)) return 'Tu sesión expiró. Vuelve a entrar.'
  if (err.code === '42501' && /permission denied|row-level security/i.test(msg)) return 'No tienes permiso para esta acción.'
  if (/row-level security/i.test(msg)) return 'No tienes permiso para esta acción.'
  if (/duplicate key|unique/i.test(msg) && err.code === '23505') return 'Ya existe un registro igual.'
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.'
  return msg
}

export function esFaseCerrada(e: unknown): boolean {
  const err = e as { hint?: string; message?: string }
  return err?.hint === 'fase_no_abierta' || /no se puede escribir/i.test(err?.message ?? '')
}
