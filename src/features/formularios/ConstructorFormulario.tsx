import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AvisoCambios } from '@/components/AvisoCambios'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { AreaTexto, Campo, Selector } from '@/components/Campo'
import { Cargando, EstadoError } from '@/components/Estados'
import { Aviso, Tarjeta } from '@/components/Ui'
import { siglaDe, useComisiones } from '@/features/comisiones/api'
import { mensajeError } from '@/lib/errores'
import { useFormulario, useGuardarFormulario } from './api'
import { FormularioRespuesta } from './FormularioRespuesta'
import { ROLES_RESPUESTA, TIPOS_CAMPO, enlacePublico, opcionesDe, type CampoBorrador, type CampoDef, type FormularioPublicoDef, type TipoCampo } from './tipos'

const ESCOGE = (t: TipoCampo) => t === 'radio' || t === 'checkbox' || t === 'lista'
let contador = 0
const nuevaClave = () => `n${++contador}`

/** Código QR del enlace, como imagen (se carga solo cuando se pide, para no engordar la página). */
function Qr({ texto }: { texto: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let vivo = true
    import('qrcode').then((m) => m.toDataURL(texto, { margin: 1, width: 360, errorCorrectionLevel: 'M' })).then((u) => vivo && setSrc(u))
    return () => {
      vivo = false
    }
  }, [texto])
  return src ? (
    <img src={src} alt="Código QR del formulario" className="size-44 shrink-0 rounded-2xl bg-white p-2" />
  ) : (
    <span className="esqueleto size-44 shrink-0 rounded-2xl" />
  )
}

function EditorCampo({
  campo,
  indice,
  total,
  rolesForm,
  onCambio,
  onMover,
  onQuitar,
}: {
  campo: CampoBorrador
  indice: number
  total: number
  rolesForm: string[]
  onCambio: (c: CampoBorrador) => void
  onMover: (d: -1 | 1) => void
  onQuitar: () => void
}) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-cond text-sm font-bold uppercase tracking-wider text-acento">
          {indice + 1} · {TIPOS_CAMPO[campo.tipo].nombre}
        </p>
        <div className="flex gap-1">
          <Boton variante="fantasma" className="min-h-9 px-2.5" disabled={indice === 0} onClick={() => onMover(-1)} aria-label="Subir pregunta">
            ↑
          </Boton>
          <Boton variante="fantasma" className="min-h-9 px-2.5" disabled={indice === total - 1} onClick={() => onMover(1)} aria-label="Bajar pregunta">
            ↓
          </Boton>
          <Boton variante="fantasma" className="min-h-9 px-2.5 text-danger" onClick={onQuitar}>
            Quitar
          </Boton>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Campo etiqueta="Pregunta" requerido value={campo.etiqueta} onChange={(e) => onCambio({ ...campo, etiqueta: e.target.value })} />
        <Selector etiqueta="Tipo de campo" value={campo.tipo} onChange={(e) => onCambio({ ...campo, tipo: e.target.value as TipoCampo })}>
          {(Object.keys(TIPOS_CAMPO) as TipoCampo[]).map((t) => (
            <option key={t} value={t}>
              {TIPOS_CAMPO[t].nombre}
            </option>
          ))}
        </Selector>
      </div>
      <Campo etiqueta="Ayuda (opcional)" value={campo.ayuda} onChange={(e) => onCambio({ ...campo, ayuda: e.target.value })} />
      {ESCOGE(campo.tipo) && (
        <AreaTexto
          etiqueta="Opciones (una por línea)"
          requerido
          rows={4}
          value={campo.opcionesTexto}
          onChange={(e) => onCambio({ ...campo, opcionesTexto: e.target.value })}
          error={campo.opcionesTexto.trim() ? null : 'Escribe al menos una opción.'}
        />
      )}
      {campo.tipo === 'personas' && (
        <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-ink-2">
          Quien responde elige a una persona registrada en la comisión que indicó (por ejemplo, quién dio el taller) o «Otro» si fue alguien externo. Requiere «Preguntar la comisión».
        </p>
      )}
      {campo.tipo === 'escala' && (
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Desde" type="number" value={campo.escala_min} onChange={(e) => onCambio({ ...campo, escala_min: Number(e.target.value) })} />
          <Campo etiqueta="Hasta" type="number" value={campo.escala_max} onChange={(e) => onCambio({ ...campo, escala_max: Number(e.target.value) })} error={campo.escala_max > campo.escala_min ? null : 'Debe ser mayor que «Desde».'} />
        </div>
      )}
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={campo.obligatorio} onChange={(e) => onCambio({ ...campo, obligatorio: e.target.checked })} />
        Respuesta obligatoria
      </label>
      {rolesForm.length > 0 && (
        <fieldset>
          <legend className="mb-1 text-sm font-bold">¿Quién la responde?</legend>
          <p className="mb-1 text-sm text-ink-3">Sin marcar ninguno, la responden todos.</p>
          <div className="flex flex-wrap gap-x-4">
            {rolesForm.map((r) => (
              <label key={r} className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--accent)]"
                  checked={campo.roles.includes(r)}
                  onChange={(e) => onCambio({ ...campo, roles: e.target.checked ? [...campo.roles, r] : campo.roles.filter((x) => x !== r) })}
                />
                Solo {ROLES_RESPUESTA[r] ?? r}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </li>
  )
}

/** Edita un formulario: sus datos, sus campos, la vista previa y el enlace público. */
export function ConstructorFormulario() {
  const { id } = useParams()
  const q = useFormulario(id)
  if (q.isPending) return <Cargando filas={4} />
  if (q.isError) return <EstadoError error={q.error} onReintentar={() => q.refetch()} />
  return <Editor key={q.data.formulario.id} datos={q.data} />
}

function Editor({ datos }: { datos: NonNullable<ReturnType<typeof useFormulario>['data']> }) {
  const f = datos.formulario
  const nav = useNavigate()
  const avisar = useAvisar()
  const guardar = useGuardarFormulario()
  const [titulo, setTitulo] = useState(f.titulo)
  const [descripcion, setDescripcion] = useState(f.descripcion ?? '')
  const [roles, setRoles] = useState<string[]>(f.roles)
  const [pideComision, setPideComision] = useState(f.pide_comision)
  const [pideRef, setPideRef] = useState(f.pide_referencia)
  const [comisionFija, setComisionFija] = useState<number | null>(f.comision_fija)
  const comisiones = useComisiones()
  const [activo, setActivo] = useState(f.activo)
  const [sucio, setSucio] = useState(false)
  const [guardado, setGuardado] = useState(false)
  // Se sale cuando ya se dibujó sin «cambios pendientes»; si no, el aviso de salida lo frena.
  useEffect(() => {
    if (guardado && !sucio) nav('/formularios')
  }, [guardado, sucio, nav])
  const [campos, setCampos] = useState<CampoBorrador[]>(() =>
    datos.campos
      .filter((c) => c.activo)
      .map((c) => ({
        clave: c.id,
        id: c.id,
        tipo: c.tipo as TipoCampo,
        etiqueta: c.etiqueta,
        ayuda: c.ayuda ?? '',
        obligatorio: c.obligatorio,
        opcionesTexto: opcionesDe(c.opciones).join('\n'),
        escala_min: c.escala_min ?? 1,
        escala_max: c.escala_max ?? 5,
        roles: c.roles,
      })),
  )
  const [originales] = useState(() => datos.campos.map((c) => c.id))
  const cambiar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setSucio(true)
  }

  const hayPersonas = campos.some((c) => c.tipo === 'personas')
  const valido = titulo.trim().length > 1 && (!hayPersonas || pideComision) && campos.every((c) => c.etiqueta.trim() && (!ESCOGE(c.tipo) || c.opcionesTexto.trim()) && (c.tipo !== 'escala' || c.escala_max > c.escala_min))

  const vistaPrevia: FormularioPublicoDef = useMemo(
    () => ({
      titulo,
      descripcion: descripcion || null,
      roles,
      pide_comision: pideComision,
      pide_referencia: pideRef,
      comision_fija: comisionFija,
      comisiones: comisionFija != null ? (comisiones.data ?? []).filter((c) => c.id === comisionFija).map((c) => ({ id: c.id, sigla: siglaDe(c), nombre: c.nombre })) : [{ id: 0, sigla: 'CTD', nombre: 'Comisión de ejemplo' }],
      campos: campos.map<CampoDef>((c) => ({
        id: c.clave,
        tipo: c.tipo,
        etiqueta: c.etiqueta || 'Pregunta sin título',
        ayuda: c.ayuda || null,
        obligatorio: c.obligatorio,
        opciones: c.opcionesTexto.split('\n').map((x) => x.trim()).filter(Boolean),
        escala_min: c.escala_min,
        escala_max: c.escala_max,
        roles: c.roles,
      })),
    }),
    [titulo, descripcion, roles, pideComision, pideRef, comisionFija, comisiones.data, campos],
  )

  const enlace = enlacePublico(f.codigo)
  const quitados = originales.filter((o) => !campos.some((c) => c.id === o))

  const alGuardar = () =>
    guardar.mutate(
      { id: f.id, titulo, descripcion, roles, pide_comision: pideComision, comision_fija: comisionFija, pide_referencia: pideRef, activo, campos, quitados },
      {
        onSuccess: () => {
          avisar('Formulario guardado.')
          setSucio(false)
          setGuardado(true)
        },
        onError: (e) => avisar(mensajeError(e), 'error'),
      },
    )

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <nav className="text-sm">
        <Link to="/formularios" className="font-bold text-acento">
          ← Formularios
        </Link>
      </nav>
      <header>
        <p className="sobretitulo text-acento">Constructor de formularios</p>
        <h1 className="text-[clamp(1.6rem,5vw,2.3rem)] font-black leading-tight tracking-tight">{titulo || 'Formulario sin título'}</h1>
      </header>
      <AvisoCambios sucio={sucio} />

      <Tarjeta titulo="Datos del formulario">
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Título" requerido value={titulo} onChange={(e) => cambiar(setTitulo)(e.target.value)} />
          <AreaTexto etiqueta="Descripción (opcional)" value={descripcion} onChange={(e) => cambiar(setDescripcion)(e.target.value)} />
          <fieldset>
            <legend className="mb-1 text-sm font-bold">¿Quién puede responder?</legend>
            <p className="mb-1 text-sm text-ink-3">Quien entra elige su rol. Sin marcar ninguno, no se pregunta.</p>
            <div className="flex flex-wrap gap-x-5">
              {Object.entries(ROLES_RESPUESTA).map(([k, n]) => (
                <label key={k} className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--accent)]"
                    checked={roles.includes(k)}
                    onChange={(e) => cambiar(setRoles)(e.target.checked ? [...roles, k] : roles.filter((x) => x !== k))}
                  />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-x-6">
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={pideComision} onChange={(e) => cambiar(setPideComision)(e.target.checked)} />
              Preguntar la comisión
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={pideRef} onChange={(e) => cambiar(setPideRef)(e.target.checked)} />
              Preguntar la sesión o el taller
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={activo} onChange={(e) => cambiar(setActivo)(e.target.checked)} />
              Recibiendo respuestas
            </label>
          </div>
          {pideComision && (
            <Selector
              etiqueta="Comisión del formulario"
              value={comisionFija ?? ''}
              onChange={(e) => cambiar(setComisionFija)(e.target.value ? Number(e.target.value) : null)}
              ayuda="«La elige quien responde» sirve para un formulario compartido. Si lo fijas a una comisión, el enlace ya trae la comisión y no se pregunta."
            >
              <option value="">La elige quien responde</option>
              {comisiones.data?.filter((c) => c.activa).map((c) => (
                <option key={c.id} value={c.id}>
                  Solo {siglaDe(c)} · {c.nombre}
                </option>
              ))}
            </Selector>
          )}
        </div>
      </Tarjeta>

      <Tarjeta titulo={`Preguntas (${campos.length})`}>
        {hayPersonas && !pideComision && (
          <div className="mb-3">
            <Aviso tono="alerta">Para preguntar por una persona de la comisión, activa «Preguntar la comisión» en los datos del formulario.</Aviso>
          </div>
        )}
        {campos.length === 0 && <p className="mb-3 text-sm text-ink-3">Todavía no hay preguntas. Agrega la primera con uno de los botones de abajo.</p>}
        <ol className="flex flex-col gap-3">
          {campos.map((c, i) => (
            <EditorCampo
              key={c.clave}
              campo={c}
              indice={i}
              total={campos.length}
              rolesForm={roles}
              onCambio={(n) => cambiar(setCampos)(campos.map((x) => (x.clave === c.clave ? n : x)))}
              onMover={(d) => {
                const n = [...campos]
                ;[n[i], n[i + d]] = [n[i + d], n[i]]
                cambiar(setCampos)(n)
              }}
              onQuitar={() => cambiar(setCampos)(campos.filter((x) => x.clave !== c.clave))}
            />
          ))}
        </ol>
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold">Agregar una pregunta</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TIPOS_CAMPO) as TipoCampo[]).map((t) => (
              <Boton
                key={t}
                variante="secundario"
                className="min-h-10"
                title={TIPOS_CAMPO[t].descripcion}
                onClick={() =>
                  cambiar(setCampos)([
                    ...campos,
                    { clave: nuevaClave(), tipo: t, etiqueta: '', ayuda: '', obligatorio: false, opcionesTexto: ESCOGE(t) ? 'Opción 1\nOpción 2' : '', escala_min: 1, escala_max: 5, roles: [] },
                  ])
                }
              >
                + {TIPOS_CAMPO[t].nombre}
              </Boton>
            ))}
          </div>
        </div>
        {datos.campos.some((c) => !c.activo) && (
          <div className="mt-4">
            <Aviso tono="info">Hay preguntas ocultas que ya tenían respuestas: se conservan para los resultados y no se muestran en el formulario.</Aviso>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Enlace para compartir">
        <div className="flex flex-wrap items-center gap-4">
          <Qr texto={enlace} />
          <div className="min-w-0 flex-1 basis-60">
            <p className="mb-2 text-sm text-ink-2">Cualquier persona con este enlace o este código QR responde sin cuenta.</p>
            <input readOnly value={enlace} onFocus={(e) => e.target.select()} className="w-full rounded-lg border border-line-strong bg-surface-2 p-2 font-mono text-sm" aria-label="Enlace público del formulario" />
            <div className="mt-2 flex flex-wrap gap-2">
              <Boton
                variante="secundario"
                onClick={() =>
                  navigator.clipboard.writeText(enlace).then(
                    () => avisar('Enlace copiado.'),
                    () => avisar('No se pudo copiar; selecciónalo manualmente.', 'error'),
                  )
                }
              >
                Copiar enlace
              </Boton>
              <a href={enlace} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-2xl px-4 font-bold text-acento">
                Abrir ↗
              </a>
            </div>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Así lo verá quien responde">
        <FormularioRespuesta def={vistaPrevia} vistaPrevia />
      </Tarjeta>

      <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 -mx-4 flex flex-col gap-2 border-t border-line bg-surface/95 px-4 pb-3 pt-3 shadow-card backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border lg:bottom-4 dark:bg-[#0b1a6b]/95">
        {guardar.isError && <Aviso tono="peligro">{mensajeError(guardar.error)}</Aviso>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="flex-1" onClick={() => nav('/formularios')}>
            Cancelar
          </Boton>
          <Boton className="flex-1" onClick={alGuardar} cargando={guardar.isPending} disabled={!valido}>
            Guardar formulario
          </Boton>
        </div>
      </div>
    </div>
  )
}
