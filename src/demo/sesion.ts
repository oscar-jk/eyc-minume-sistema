/** Usuarios ficticios de la demostración y su «sesión». Ligero: no importa la base. */
export type RolDemo = 'eyc' | 'subse' | 'sg' | 'admin'

export const DEMO_USUARIOS: Record<RolDemo, { id: string; email: string; nombre: string }> = {
  eyc: { id: 'de000000-0000-4000-8000-00000000e001', email: 'eyc@demostracion.invalid', nombre: 'Equipo de EyC' },
  subse: { id: 'de000000-0000-4000-8000-00000000e002', email: 'subse@demostracion.invalid', nombre: 'Subsecretaría' },
  sg: { id: 'de000000-0000-4000-8000-00000000e003', email: 'sg@demostracion.invalid', nombre: 'Secretaría General' },
  admin: { id: 'de000000-0000-4000-8000-00000000e004', email: 'admin@demostracion.invalid', nombre: 'Administración' },
}

function b64url(s: string) {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Sesión falsa y válida por años: el cliente la lee del almacenamiento y nunca intenta renovarla. */
export function sesionDemo(rol: RolDemo) {
  const u = DEMO_USUARIOS[rol]
  const ahora = Math.floor(Date.now() / 1000)
  const exp = ahora + 60 * 60 * 24 * 365 * 5
  return {
    access_token: `demo.${b64url(JSON.stringify({ sub: u.id, role: 'authenticated', exp }))}.firma`,
    refresh_token: 'demo',
    token_type: 'bearer',
    expires_in: exp - ahora,
    expires_at: exp,
    user: {
      id: u.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: u.email,
      app_metadata: {},
      user_metadata: { nombre: u.nombre },
      created_at: new Date(ahora * 1000).toISOString(),
    },
  }
}
