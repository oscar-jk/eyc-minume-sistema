import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const control =
  'w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-3 aria-[invalid=true]:border-danger min-h-11'

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
      <label htmlFor={id} className="text-sm font-semibold text-ink">
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

export function Campo({ etiqueta, ayuda, error, requerido, className, ...rest }: Envoltura & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Marco id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={requerido} className={className}>
      <input id={id} className={control} required={requerido} {...aria(id, error, ayuda)} {...rest} />
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
