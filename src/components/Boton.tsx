import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'claro'

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-xl font-bold tracking-tight transition-all duration-200 min-h-11 px-5 text-[0.95rem] select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]'

/** Sin botones de solo contorno: todos llevan relleno (degradado de marca o tinte). */
const variantes: Record<Variante, string> = {
  primario: 'bg-grad-primario text-white shadow-boton hover:brightness-110 hover:-translate-y-px',
  secundario: 'bg-accent-soft text-acento hover:brightness-95 dark:hover:brightness-125',
  fantasma: 'text-acento hover:bg-accent-soft px-3',
  peligro: 'bg-grad-rosa text-white shadow-[0_8px_20px_-8px_rgb(229_53_53/0.6)] hover:brightness-110 hover:-translate-y-px',
  claro: 'bg-white text-[#0043c5] shadow-[0_8px_24px_-10px_rgb(0_0_0/0.4)] hover:-translate-y-px',
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

