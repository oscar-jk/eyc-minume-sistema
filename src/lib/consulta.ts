import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
})

/** Tipo de datos de la rama exitosa de una respuesta de Supabase. */
type Exito<R> = R extends { error: null; data: infer D } ? D : never

/** Lanza el error de una respuesta de Supabase o devuelve sus datos. */
export function datos<R extends { data: unknown; error: unknown }>(r: R): Exito<R> {
  if (r.error) throw r.error
  return r.data as Exito<R>
}
