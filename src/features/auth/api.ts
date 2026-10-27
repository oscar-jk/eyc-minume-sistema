import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { datos } from '@/lib/consulta'
import type { Perfil } from '@/lib/tipos'

export async function obtenerSesion(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function escucharSesion(cb: (evento: string, s: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((evento, s) => cb(evento, s))
  return () => data.subscription.unsubscribe()
}

export async function obtenerPerfil(id: string): Promise<Perfil | null> {
  return datos(await supabase.from('perfiles').select('*').eq('id', id).maybeSingle())
}

export async function entrar(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
}

export async function salir() {
  await supabase.auth.signOut()
}

export async function solicitarRecuperacion(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/nueva-contrasena`,
  })
  if (error) throw error
}

export async function cambiarContrasena(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

/** Canjea el enlace de acceso (de un solo uso) cuando la persona toca «Continuar». Así los correos que «abren» los enlaces para revisarlos no los gastan. */
export async function verificarEnlace(tokenHash: string) {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
  if (error) throw error
}
