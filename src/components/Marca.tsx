const ARCHIVO = {
  header: { base: 'header-logo', alt: 'MINUME XVII' },
  footer: { base: 'footer-logo', alt: 'Ministerio de Educación · PLERD' },
  login: { base: 'login-lockup', alt: 'MINUME XVII Período de Sesiones' },
} as const

/** Logos oficiales: versión clara (tinta oscura) y oscura (blanca), según el tema. */
export function Marca({ tipo, className = '' }: { tipo: keyof typeof ARCHIVO; className?: string }) {
  const { base, alt } = ARCHIVO[tipo]
  return (
    <>
      <img src={`/brand/${base}-light.png`} alt={alt} className={`dark:hidden ${className}`} />
      <img src={`/brand/${base}-dark.png`} alt={alt} className={`hidden dark:block ${className}`} />
    </>
  )
}
