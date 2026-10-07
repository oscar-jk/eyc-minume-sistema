const ARCHIVO = {
  /** «MINUME XVII Período de Sesiones» */
  lockup: { base: 'login-lockup', alt: 'MINUME XVII Período de Sesiones' },
  /** «MINUME de ESTRELLAS» */
  estrellas: { base: 'header-logo', alt: 'MINUME de Estrellas' },
  footer: { base: 'footer-logo', alt: 'Ministerio de Educación · PLERD' },
} as const

/** Logos oficiales: versión de tinta oscura (tema claro) y blanca (tema oscuro o fondos en degradado). */
export function Marca({ tipo, className = '', blanco = false }: { tipo: keyof typeof ARCHIVO; className?: string; blanco?: boolean }) {
  const { base, alt } = ARCHIVO[tipo]
  if (blanco) return <img src={`/brand/${base}-dark.png`} alt={alt} className={className} />
  return (
    <>
      <img src={`/brand/${base}-light.png`} alt={alt} className={`dark:hidden ${className}`} />
      <img src={`/brand/${base}-dark.png`} alt={alt} className={`hidden dark:block ${className}`} />
    </>
  )
}
