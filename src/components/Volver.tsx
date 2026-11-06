import { useLocation, useNavigate } from 'react-router-dom'
import { IcoAtras } from './Iconos'

/**
 * «Volver» arriba de las pantallas internas. Regresa a la pantalla anterior; si se llegó directo
 * (enlace, recarga, pestaña nueva) no hay anterior y va a `a`.
 */
export function Volver({ a = '/', texto = 'Volver', claro = false, className = '' }: { a?: string; texto?: string; claro?: boolean; className?: string }) {
  const nav = useNavigate()
  const { key } = useLocation()
  return (
    <button
      type="button"
      onClick={() => (key !== 'default' ? nav(-1) : nav(a))}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-2xl pl-2.5 pr-4 font-bold transition ${claro ? 'bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20' : 'bg-accent-soft text-acento hover:brightness-95'} ${className}`}
    >
      <IcoAtras className="size-5" aria-hidden />
      {texto}
    </button>
  )
}
