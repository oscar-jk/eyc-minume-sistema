import { createClient } from '@supabase/supabase-js'
import { almacenDemo, fetchDemo, modoDemo, URL_DEMO } from '@/demo/cliente'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!modoDemo && (!url || !key)) {
  throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY (ver .env.example).')
}

/**
 * Cliente único. Solo la llave publicable: todo acceso lo decide RLS en la base.
 * En el modo demostración (?demo=…) el cliente no sale a la red: habla con una base en memoria con datos ficticios.
 */
export const supabase = modoDemo
  ? createClient<Database>(URL_DEMO, 'demostracion', {
      global: { fetch: fetchDemo },
      auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb-demo-auth-token', storage: almacenDemo() },
    })
  : createClient<Database>(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
