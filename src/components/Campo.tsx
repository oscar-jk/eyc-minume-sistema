import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const control =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-ink-3 min-h-12 shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 aria-[invalid=true]:border-danger dark:bg-white/[0.06]'

interface Envoltura {
  etiqueta: ReactNode
  ayuda?: ReactNode
  error?: string | null
  requerido?: boolean
  className?: string
}

function Marco({ id, etiqueta, ayuda, error, requerido, className = '', children }: Envoltura & { id: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {etiqueta}
        {requerido && <span className="text-danger"> *</span>}
      </label>
      {children}
      {ayuda && !error && (
        <p id={`${id}-ayuda`} className="text-sm text-ink-3">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function aria(id: string, error?: string | null, ayuda?: ReactNode) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined,
  }
}

export function Campo({ etiqueta, ayuda, error, requerido, className, type, ...rest }: Envoltura & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const [ver, setVer] = useState(false)
  const esClave = type === 'password'
  return (
    <Marco id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={requerido} className={className}>
      {esClave ? (
        <div className="relative">
          <input id={id} type={ver ? 'text' : 'password'} className={`${control} pr-12`} required={requerido} {...aria(id, error, ayuda)} {...rest} />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={ver}
            className="absolute inset-y-0 right-1 my-auto grid size-10 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
              {ver ? (
                <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
              ) : (
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              )}
            </svg>
          </button>
        </div>
      ) : (
        <input id={id} type={type} className={control} required={requerido} {...aria(id, error, ayuda)} {...rest} />
      )}
    </Marco>
  )
}

export function AreaTexto({ etiqueta, ayuda, error, requerido, className, ...rest }: Envoltura & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Marco id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={requerido} className={className}>
      <textarea id={id} rows={3} className={`${control} resize-y`} required={requerido} {...aria(id, error, ayuda)} {...rest} />
    </Marco>
  )
}

export function Selector({
  etiqueta,
  ayuda,
  error,
  requerido,
  className,
  children,
  ...rest
}: Envoltura & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const id = useId()
  return (
    <Marco id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={requerido} className={className}>
      <select id={id} className={control} required={requerido} {...aria(id, error, ayuda)} {...rest}>
        {children}
      </select>
    </Marco>
  )
}
