import { useId, useState } from 'react'
import { Boton } from '@/components/Boton'
import { AreaTexto, Campo, Selector } from '@/components/Campo'
import { Aviso } from '@/components/Ui'
import { useFormularioPersonas } from './api'
import { ROLES_RESPUESTA, aplicaA, type CampoDef, type FormularioPublicoDef, type PersonaComision, type Valor, type ValorPersona, type Valores } from './tipos'

function Etiqueta({ id, c }: { id: string; c: CampoDef }) {
  return (
    <>
      <span id={id} className="text-sm font-bold text-ink">
        {c.etiqueta}
        {c.obligatorio && <span className="text-danger"> *</span>}
      </span>
      {c.ayuda && <span className="text-sm text-ink-3">{c.ayuda}</span>}
    </>
  )
}

/** Un campo de cualquier tipo. Valor: texto, número, sí/no (boolean), o lista de opciones (casillas). */
export function CampoEntrada({
  campo: c,
  valor,
  onCambio,
  error,
  personas,
}: {
  campo: CampoDef
  valor: Valor
  onCambio: (v: Valor) => void
  error?: string
  /** Personas de la comisión elegida (solo para el tipo «personas»); undefined = todavía no se elige comisión. */
  personas?: PersonaComision[]
}) {
  const id = useId()
  const aviso = error && (
    <p role="alert" className="text-sm font-medium text-danger">
      {error}
    </p>
  )

  switch (c.tipo) {
    case 'texto':
    case 'fecha':
      return <Campo etiqueta={c.etiqueta} ayuda={c.ayuda} requerido={c.obligatorio} error={error} type={c.tipo === 'fecha' ? 'date' : 'text'} maxLength={500} value={(valor as string) ?? ''} onChange={(e) => onCambio(e.target.value || undefined)} />
    case 'numero':
      return <Campo etiqueta={c.etiqueta} ayuda={c.ayuda} requerido={c.obligatorio} error={error} type="number" inputMode="decimal" value={valor == null ? '' : String(valor)} onChange={(e) => onCambio(e.target.value === '' ? undefined : Number(e.target.value))} />
    case 'parrafo':
      return <AreaTexto etiqueta={c.etiqueta} ayuda={c.ayuda} requerido={c.obligatorio} error={error} maxLength={4000} value={(valor as string) ?? ''} onChange={(e) => onCambio(e.target.value || undefined)} />
    case 'lista':
      return (
        <Selector etiqueta={c.etiqueta} ayuda={c.ayuda} requerido={c.obligatorio} error={error} value={(valor as string) ?? ''} onChange={(e) => onCambio(e.target.value || undefined)}>
          <option value="">Elige…</option>
          {c.opciones.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Selector>
      )
    case 'radio':
      return (
        <fieldset aria-labelledby={id} className="flex flex-col gap-2">
          <Etiqueta id={id} c={c} />
          {c.opciones.map((o) => (
            <label key={o} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 transition-colors ${valor === o ? 'border-transparent bg-grad-primario text-white shadow-boton' : 'border-line bg-surface-2 hover:border-accent dark:bg-white/[0.05]'}`}>
              <input type="radio" name={id} checked={valor === o} onChange={() => onCambio(o)} className="size-5 accent-[var(--accent)]" />
              <span className="font-semibold">{o}</span>
            </label>
          ))}
          {aviso}
        </fieldset>
      )
    case 'checkbox': {
      const sel = Array.isArray(valor) ? valor : []
      return (
        <fieldset aria-labelledby={id} className="flex flex-col gap-2">
          <Etiqueta id={id} c={c} />
          {c.opciones.map((o) => (
            <label key={o} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 transition-colors ${sel.includes(o) ? 'border-accent bg-accent-soft' : 'border-line bg-surface-2 hover:border-accent dark:bg-white/[0.05]'}`}>
              <input
                type="checkbox"
                checked={sel.includes(o)}
                onChange={(e) => {
                  const n = e.target.checked ? [...sel, o] : sel.filter((x) => x !== o)
                  onCambio(n.length ? n : undefined)
                }}
                className="size-5 accent-[var(--accent)]"
              />
              <span className="font-semibold">{o}</span>
            </label>
          ))}
          {aviso}
        </fieldset>
      )
    }
    case 'escala': {
      const valores = Array.from({ length: c.escala_max - c.escala_min + 1 }, (_, i) => c.escala_min + i)
      return (
        <fieldset aria-labelledby={id} className="flex flex-col gap-2">
          <Etiqueta id={id} c={c} />
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={id}>
            {valores.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={valor === n}
                onClick={() => onCambio(n)}
                className={`grid min-h-12 min-w-12 place-items-center rounded-2xl border-2 px-3 font-cond text-xl font-bold tabular transition-colors ${valor === n ? 'border-transparent bg-grad-primario text-white shadow-boton' : 'border-line bg-surface-2 text-ink-2 hover:border-accent dark:bg-white/[0.05]'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="flex justify-between font-cond text-xs font-semibold uppercase tracking-wider text-ink-3">
            <span>{c.escala_min} · menos</span>
            <span>más · {c.escala_max}</span>
          </p>
          {aviso}
        </fieldset>
      )
    }
    case 'personas': {
      const v = (valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {}) as ValorPersona
      const otro = v.otro !== undefined
      return (
        <fieldset aria-labelledby={id} className="flex flex-col gap-2">
          <Etiqueta id={id} c={c} />
          {personas === undefined ? (
            <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-3 dark:bg-white/[0.05]">Elige primero la comisión para ver a sus integrantes.</p>
          ) : (
            <Selector
              etiqueta="Persona"
              value={otro ? '__otro' : (v.persona_id ?? '')}
              onChange={(e) => {
                const x = e.target.value
                onCambio(x === '' ? undefined : x === '__otro' ? { otro: '' } : { persona_id: x })
              }}
            >
              <option value="">Elige…</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · {p.cargo}
                </option>
              ))}
              <option value="__otro">Otro (persona externa)…</option>
            </Selector>
          )}
          {otro && <Campo etiqueta="Nombre de la persona" maxLength={120} value={v.otro ?? ''} onChange={(e) => onCambio({ otro: e.target.value })} />}
          {aviso}
        </fieldset>
      )
    }
    case 'si_no':
      return (
        <fieldset aria-labelledby={id} className="flex flex-col gap-2">
          <Etiqueta id={id} c={c} />
          <div className="grid grid-cols-2 gap-2">
            {([true, false] as const).map((b) => (
              <button
                key={String(b)}
                type="button"
                aria-pressed={valor === b}
                onClick={() => onCambio(b)}
                className={`min-h-12 rounded-2xl border-2 font-cond text-lg font-bold transition-colors ${valor === b ? 'border-transparent bg-grad-primario text-white shadow-boton' : 'border-line bg-surface-2 text-ink-2 hover:border-accent dark:bg-white/[0.05]'}`}
              >
                {b ? 'Sí' : 'No'}
              </button>
            ))}
          </div>
          {aviso}
        </fieldset>
      )
  }
}

/** Cuerpo de un formulario: «¿quién eres?», comisión, sesión o taller y los campos que le tocan a ese rol. */
export function FormularioRespuesta({
  def,
  onEnviar,
  enviando,
  errorEnvio,
  vistaPrevia = false,
  codigo,
}: {
  def: FormularioPublicoDef
  onEnviar?: (p: { rol: string | null; comision_id: number | null; referencia: string; respuestas: Valores; web: string }) => void
  enviando?: boolean
  errorEnvio?: string | null
  vistaPrevia?: boolean
  /** Código público del formulario: sirve para pedir las personas de la comisión. */
  codigo?: string
}) {
  const [rol, setRol] = useState<string | null>(def.roles.length === 1 ? def.roles[0] : null)
  const [comision, setComision] = useState(def.comision_fija != null ? String(def.comision_fija) : '')
  const [referencia, setReferencia] = useState('')
  const [valores, setValores] = useState<Valores>({})
  const [web, setWeb] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})

  const campos = def.campos.filter((c) => aplicaA(c, rol))
  const hayPersonas = campos.some((c) => c.tipo === 'personas')
  const personasQ = useFormularioPersonas(codigo, comision ? Number(comision) : null, hayPersonas && def.pide_comision && !vistaPrevia)
  // Vista previa del constructor: personas de ejemplo.
  const personas: PersonaComision[] | undefined = vistaPrevia
    ? [{ id: 'ej', nombre: 'Nombre de ejemplo', cargo: 'Director' }]
    : comision
      ? (personasQ.data ?? [])
      : undefined
  const necesitaRol = def.roles.length > 0

  const validar = () => {
    const e: Record<string, string> = {}
    if (necesitaRol && !rol) e.rol = 'Elige quién eres.'
    if (def.pide_comision && !comision) e.comision = 'Elige la comisión.'
    if (def.pide_referencia && !referencia.trim()) e.referencia = 'Escribe la sesión o el taller.'
    for (const c of campos) {
      const v = valores[c.id]
      if (c.tipo === 'personas' && v && typeof v === 'object' && !Array.isArray(v) && v.otro !== undefined && !v.otro.trim()) e[c.id] = 'Escribe el nombre de la persona.'
      else if (c.obligatorio && (v === undefined || v === '' || (Array.isArray(v) && !v.length))) e[c.id] = 'Esta pregunta es obligatoria.'
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (vistaPrevia || !validar()) return
        onEnviar?.({ rol, comision_id: comision ? Number(comision) : null, referencia: referencia.trim(), respuestas: Object.fromEntries(campos.map((c) => [c.id, valores[c.id]])), web })
      }}
    >
      {necesitaRol && (
        <Selector etiqueta="¿Quién eres?" requerido value={rol ?? ''} error={errores.rol} onChange={(e) => setRol(e.target.value || null)}>
          <option value="">Elige…</option>
          {def.roles.map((r) => (
            <option key={r} value={r}>
              {ROLES_RESPUESTA[r] ?? r}
            </option>
          ))}
        </Selector>
      )}
      {def.pide_comision && def.comision_fija != null && (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 dark:bg-white/[0.04]">
          <span className="text-sm font-bold">Comisión</span>
          <br />
          {def.comisiones.map((c) => `${c.sigla} · ${c.nombre}`).join('')}
        </p>
      )}
      {def.pide_comision && def.comision_fija == null && (
        <Selector etiqueta="Comisión" requerido value={comision} error={errores.comision} onChange={(e) => setComision(e.target.value)}>
          <option value="">Elige…</option>
          {def.comisiones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.sigla} · {c.nombre}
            </option>
          ))}
        </Selector>
      )}
      {def.pide_referencia && (
        <Campo etiqueta="Sesión o taller" requerido error={errores.referencia} maxLength={120} placeholder="Ej.: Sesión del martes, Taller de procedimiento" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
      )}

      {(!necesitaRol || rol) &&
        campos.map((c) => (
          <CampoEntrada key={c.id} campo={c} valor={valores[c.id]} error={errores[c.id]} personas={personas} onCambio={(v) => setValores((x) => ({ ...x, [c.id]: v }))} />
        ))}
      {necesitaRol && !rol && campos.length > 0 && <p className="text-sm text-ink-3">Elige quién eres para ver las preguntas.</p>}

      {/* Trampa para bots: las personas no la ven ni la llenan. */}
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={web} onChange={(e) => setWeb(e.target.value)} className="absolute -left-[9999px] size-0 opacity-0" name="web" />

      {errorEnvio && <Aviso tono="peligro">{errorEnvio}</Aviso>}
      {Object.keys(errores).length > 0 && <Aviso tono="alerta">Revisa las preguntas marcadas.</Aviso>}
      <Boton type="submit" className="min-h-12 w-full text-base" cargando={enviando} disabled={vistaPrevia}>
        {vistaPrevia ? 'Vista previa (no se envía)' : 'Enviar respuesta'}
      </Boton>
    </form>
  )
}
