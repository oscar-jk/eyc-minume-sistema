import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors min-h-11 px-4 text-sm disabled:opacity-55 disabled:cursor-not-allowed select-none'
const variantes: Record<Variante, string> = {
  primario: 'bg-accent text-accent-ink hover:bg-accent-hover',
  secundario: 'border border-line-strong bg-surface text-ink hover:bg-surface-2',
  fantasma: 'text-accent hover:bg-accent-soft',
  peligro: 'bg-danger text-accent-ink hover:opacity-90',
}

export function Boton({
  variante = 'primario',
  cargando = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean; children: ReactNode }) {
  return (
    <button
      type={type}
      className={`${base} ${variantes[variante]} ${className}`}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...rest}
    >
      {cargando && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  )
}
