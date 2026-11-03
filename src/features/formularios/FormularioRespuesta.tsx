import { useId, useState } from 'react'
import { Boton } from '@/components/Boton'
import { AreaTexto, Campo, Selector } from '@/components/Campo'
import { Aviso } from '@/components/Ui'
import { useFormularioPersonas } from './api'
import { PREFIJO_OTRO, ROLES_RESPUESTA, aplicaA, type CampoDef, type FormularioPublicoDef, type PersonaComision, type Valor, type ValorPersona, type Valores } from './tipos'

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

const esOtro = (v: Valor): v is string => typeof v === 'string' && v.startsWith(PREFIJO_OTRO)
const otroTexto = (v: Valor) => (esOtro(v) ? v.slice(PREFIJO_OTRO.length) : '')

/** Opción «Otro»: se marca y se escribe la respuesta propia en el mismo renglón. */
function OpcionOtro({ tipo, name, texto, activo, onCambio }: { tipo: 'radio' | 'checkbox'; name: string; texto: string; activo: boolean; onCambio: (t: string | null) => void }) {
  return (
    <label className={`flex min-h-12 cursor-text items-center gap-3 rounded-2xl border-2 px-4 py-2 transition-colors ${activo ? 'border-accent bg-accent-soft' : 'border-line bg-surface-2 hover:border-accent dark:bg-white/[0.05]'}`}>
      <input type={tipo} name={tipo === 'radio' ? name : undefined} checked={activo} onChange={(e) => onCambio(e.target.checked ? texto : null)} className="size-5 shrink-0 accent-[var(--accent)]" />
      <span className="font-semibold">Otro:</span>
      <input
        type="text"
        maxLength={290}
        value={texto}
        placeholder="Escribe tu respuesta"
        aria-label="Escribe tu respuesta en «Otro»"
        onFocus={() => !activo && onCambio(texto)}
        onChange={(e) => onCambio(e.target.value)}
        className="min-w-0 flex-1 border-b border-line-strong bg-transparent py-1 text-base focus:border-accent focus:outline-none"
      />
    </label>
  )
}

/** Cómo se responde cada tipo de pregunta, en palabras sencillas. */
function comoResponder(c: CampoDef): string {
  switch (c.tipo) {
    case 'texto': return 'Escribe tu respuesta'
    case 'parrafo': return 'Escribe tu respuesta con el detalle que quieras'
    case 'numero': return 'Escribe un número'
    case 'fecha': return 'Elige una fecha'
    case 'radio': return c.con_otro ? 'Elige UNA opción (o escribe la tuya en «Otro»)' : 'Elige UNA opción'
    case 'checkbox': return c.con_otro ? 'Marca TODAS las que apliquen (puedes agregar «Otro»)' : 'Marca TODAS las que apliquen'
    case 'lista': return 'Elige una opción de la lista'
    case 'escala': return `Elige un valor del ${c.escala_min} al ${c.escala_max}`
    case 'si_no': return 'Responde Sí o No'
    case 'personas': return 'Elige a la persona de la lista'
    case 'seccion': return ''
  }
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
            <label key={o} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2 transition-colors ${valor === o ? 'border-transparent bg-grad-primario text-white shadow-boton' : 'border-line bg-surface-2 hover:border-accent dark:bg-white/[0.05]'}`}>
              <input type="radio" name={id} checked={valor === o} onChange={() => onCambio(o)} className="size-5 shrink-0 accent-[var(--accent)]" />
              <span className="font-semibold">{o}</span>
            </label>
          ))}
          {c.con_otro && <OpcionOtro tipo="radio" name={id} texto={otroTexto(valor)} activo={esOtro(valor)} onCambio={(t) => onCambio(t === null ? undefined : PREFIJO_OTRO + t)} />}
          {aviso}
        </fieldset>
      )
    case 'checkbox': {
      const sel = Array.isArray(valor) ? valor : []
      return (
        <fieldset aria-labelledby={id} className="flex flex-col gap-2">
          <Etiqueta id={id} c={c} />
          {c.opciones.map((o) => (
            <label key={o} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2 transition-colors ${sel.includes(o) ? 'border-accent bg-accent-soft' : 'border-line bg-surface-2 hover:border-accent dark:bg-white/[0.05]'}`}>
              <input
                type="checkbox"
                checked={sel.includes(o)}
                onChange={(e) => {
                  const n = e.target.checked ? [...sel, o] : sel.filter((x) => x !== o)
                  onCambio(n.length ? n : undefined)
                }}
                className="size-5 shrink-0 accent-[var(--accent)]"
              />
              <span className="font-semibold">{o}</span>
            </label>
          ))}
          {c.con_otro && (
            <OpcionOtro
              tipo="checkbox"
              name={id}
              texto={otroTexto(sel.find(esOtro))}
              activo={sel.some(esOtro)}
              onCambio={(t) => {
                const sinOtro = sel.filter((x) => !esOtro(x))
                const n = t === null ? sinOtro : [...sinOtro, PREFIJO_OTRO + t]
                onCambio(n.length ? n : undefined)
              }}
            />
          )}
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
    case 'seccion':
      return null
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

/** Quita los espacios sobrantes del texto escrito en «Otro». */
const limpiar = (v: Valor): Valor => (esOtro(v) ? PREFIJO_OTRO + otroTexto(v).trim() : Array.isArray(v) ? v.map((x) => (esOtro(x) ? PREFIJO_OTRO + otroTexto(x).trim() : x)) : v)

/** Encabezado de un paso: un número y un título que se distinguen a simple vista. */
function Paso({ n, titulo, ayuda }: { n: number; titulo: string; ayuda?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-grad-primario font-cond text-lg font-extrabold text-white shadow-boton">
        {n}
      </span>
      <div>
        <h2 className="text-xl font-black leading-tight tracking-tight">{titulo}</h2>
        {ayuda && <p className="text-sm text-ink-3">{ayuda}</p>}
      </div>
    </div>
  )
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
  const preguntas = campos.filter((c) => c.tipo !== 'seccion')
  const vacia = (v: Valor) => v === undefined || v === '' || (Array.isArray(v) && !v.length) || (esOtro(v) && !otroTexto(v).trim()) || (Array.isArray(v) && v.length === 1 && esOtro(v[0]) && !otroTexto(v[0]).trim())
  const obligatorias = preguntas.filter((c) => c.obligatorio)
  const respondidas = obligatorias.filter((c) => !vacia(valores[c.id])).length
  const pideDatos = necesitaRol || def.pide_comision || def.pide_referencia

  const validar = () => {
    const e: Record<string, string> = {}
    if (necesitaRol && !rol) e.rol = 'Elige quién eres.'
    if (def.pide_comision && !comision) e.comision = 'Elige la comisión.'
    if (def.pide_referencia && !referencia.trim()) e.referencia = 'Escribe la sesión o el taller.'
    for (const c of campos) {
      const v = valores[c.id]
      if (c.tipo === 'personas' && v && typeof v === 'object' && !Array.isArray(v) && v.otro !== undefined && !v.otro.trim()) e[c.id] = 'Escribe el nombre de la persona.'
      else if (c.tipo !== 'seccion' && c.con_otro && ((esOtro(v) && !otroTexto(v).trim()) || (Array.isArray(v) && v.some((x) => esOtro(x) && !otroTexto(x).trim())))) e[c.id] = 'Escribe tu respuesta en «Otro» o desmárcalo.'
      else if (c.tipo !== 'seccion' && c.obligatorio && (v === undefined || v === '' || (Array.isArray(v) && !v.length))) e[c.id] = 'Esta pregunta es obligatoria.'
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
        onEnviar?.({ rol, comision_id: comision ? Number(comision) : null, referencia: referencia.trim(), respuestas: Object.fromEntries(preguntas.map((c) => [c.id, limpiar(valores[c.id])])), web })
      }}
    >
      <div className="rounded-2xl border border-accent/30 bg-accent-soft p-4 text-sm text-ink-2">
        <p className="mb-1 font-bold text-ink">Cómo llenar este formulario</p>
        <ul className="list-disc space-y-0.5 pl-5">
          <li>
            Las preguntas con <span className="font-bold text-danger">*</span> son obligatorias.
          </li>
          <li>Cada pregunta dice arriba cómo responderla: elegir una opción, marcar varias o escribir.</li>
          <li>No necesitas cuenta. Revisa todo y toca «Enviar respuesta» al final.</li>
        </ul>
      </div>

      {pideDatos && (
        <section aria-label="Tus datos" className="flex flex-col gap-4">
          <Paso n={1} titulo="Tus datos" ayuda="Para saber quién responde y de dónde." />
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 dark:bg-white/[0.04]">
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
              <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 dark:bg-white/[0.04]">
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
          </div>
        </section>
      )}

      {(!necesitaRol || rol) && campos.length > 0 && (
        <section aria-label="Preguntas" className="flex flex-col gap-4">
          {!campos.some((c) => c.tipo === 'seccion') && <Paso n={pideDatos ? 2 : 1} titulo="Preguntas" ayuda={`${preguntas.length} ${preguntas.length === 1 ? 'pregunta' : 'preguntas'}`} />}
          {(() => {
            let n = 0
            return campos.map((c) => {
              if (c.tipo === 'seccion')
                return (
                  <div key={c.id} className="mt-3 rounded-2xl bg-grad-primario p-4 text-white shadow-boton">
                    <p className="sobretitulo text-cian">Sección</p>
                    <h2 className="text-xl font-black leading-tight">{c.etiqueta}</h2>
                    {c.ayuda && <p className="mt-1 whitespace-pre-line text-sm text-white/85">{c.ayuda}</p>}
                  </div>
                )
              n++
              return (
                <div key={c.id} className={`flex flex-col gap-3 rounded-2xl border bg-surface p-4 dark:bg-white/[0.04] ${errores[c.id] ? 'border-danger' : 'border-line'}`}>
                  <p className="font-cond text-xs font-bold uppercase tracking-wider text-acento">
                    Pregunta {n} de {preguntas.length} · {comoResponder(c)}
                  </p>
                  <CampoEntrada campo={c} valor={valores[c.id]} error={errores[c.id]} personas={personas} onCambio={(v) => setValores((x) => ({ ...x, [c.id]: v }))} />
                </div>
              )
            })
          })()}
        </section>
      )}
      {necesitaRol && !rol && campos.length > 0 && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-3 dark:bg-white/[0.05]">Elige quién eres en «Tus datos» para ver las preguntas.</p>}

      {/* Trampa para bots: las personas no la ven ni la llenan. */}
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={web} onChange={(e) => setWeb(e.target.value)} className="absolute -left-[9999px] size-0 opacity-0" name="web" />

      {obligatorias.length > 0 && (!necesitaRol || rol) && (
        <div>
          <p className="mb-1 flex justify-between text-sm font-semibold text-ink-2">
            <span>Preguntas obligatorias respondidas</span>
            <span className="tabular">
              {respondidas} de {obligatorias.length}
            </span>
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2 dark:bg-white/10">
            <div className="h-full rounded-full bg-grad-celeste transition-all" style={{ width: `${Math.round((respondidas / obligatorias.length) * 100)}%` }} />
          </div>
        </div>
      )}
      {errorEnvio && <Aviso tono="peligro">{errorEnvio}</Aviso>}
      {Object.keys(errores).length > 0 && <Aviso tono="alerta">Revisa las preguntas marcadas.</Aviso>}
      <Boton type="submit" className="min-h-12 w-full text-base" cargando={enviando} disabled={vistaPrevia}>
        {vistaPrevia ? 'Vista previa (no se envía)' : 'Enviar respuesta'}
      </Boton>
    </form>
  )
}
