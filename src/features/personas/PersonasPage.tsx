import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMomento } from '@/app/fase'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { AreaTexto, Campo, Selector } from '@/components/Campo'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Modal } from '@/components/Modal'
import { Acento, Aviso, Insignia, Pestanas, Tabla, Tarjeta, Titulo } from '@/components/Ui'
import { useMoverAsignaciones, useVigentes, type Movimiento } from '@/features/asignaciones/api'
import { siglaDe, useCargos, useComisiones } from '@/features/comisiones/api'
import { mensajeError } from '@/lib/errores'
import { AMBITO, MOTIVO, fechaHora } from '@/lib/formato'
import type { Ambito, Cargo, Comision, MotivoAsignacion } from '@/lib/tipos'
import { useAltaPersonas, usePersonas, type AltaPersona } from './api'
import { EditarPersona } from './EditarPersona'

type Tab = 'asignaciones' | 'alta' | 'masiva'

export function PersonasPage() {
  const [tab, setTab] = useState<Tab>('asignaciones')
  return (
    <>
      <Titulo sobre="Gestión" adorno="circulos" sub="Registro de personas, asignaciones iniciales y rotaciones">
        Personas <Acento>y</Acento> asignaciones
      </Titulo>
      <Pestanas
        etiqueta="Secciones de personas"
        valor={tab}
        onCambio={setTab}
        opciones={[
          { valor: 'asignaciones', etiqueta: 'Asignaciones' },
          { valor: 'alta', etiqueta: 'Alta individual' },
          { valor: 'masiva', etiqueta: 'Carga masiva' },
        ]}
      />
      {tab === 'asignaciones' && <AsignacionesPanel />}
      {tab === 'alta' && <AltaIndividual />}
      {tab === 'masiva' && <CargaMasiva />}
    </>
  )
}

// ───────────── Asignaciones vigentes y movimientos ─────────────
function AsignacionesPanel() {
  const vigentes = useVigentes()
  const personas = usePersonas()
  const comisiones = useComisiones()
  const [comision, setComision] = useState('')
  const [mover, setMover] = useState<{ personaId: string; nombre: string } | null>(null)
  const [editarId, setEditarId] = useState<string | null>(null)
  const editando = personas.data?.find((p) => p.id === editarId)

  const asignadas = new Set((vigentes.data ?? []).map((v) => v.persona_id))
  const sinAsignar = (personas.data ?? []).filter((p) => p.activa && !asignadas.has(p.id))

  return (
    <div className="flex flex-col gap-5">
      {sinAsignar.length > 0 && (
        <Tarjeta titulo={`Sin asignación vigente (${sinAsignar.length})`}>
          <ul className="flex flex-col gap-2">
            {sinAsignar.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-accent hover:shadow-card dark:bg-white/[0.04]">
                <div className="min-w-0 flex-1 basis-[13rem]">
                  <Link to={`/personas/${p.id}`} className="font-semibold hover:underline">
                    {p.nombre}
                  </Link>
                  <p className="font-cond text-sm text-ink-3">{AMBITO[p.ambito]}</p>
                </div>
                <Boton variante="secundario" onClick={() => setMover({ personaId: p.id, nombre: p.nombre })}>
                  Asignar
                </Boton>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta
        titulo="Asignaciones vigentes"
        accion={
          <Selector etiqueta="Comisión" value={comision} onChange={(e) => setComision(e.target.value)} className="min-w-52">
            <option value="">Todas</option>
            {comisiones.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {siglaDe(c)}
              </option>
            ))}
          </Selector>
        }
      >
        <Consulta q={vigentes} vacio={<EstadoVacio titulo="Nadie asignado todavía">Registra personas en «Alta individual» o «Carga masiva».</EstadoVacio>}>
          {(filas) => (
            <Tabla etiqueta="Asignaciones vigentes">
              <thead>
                <tr>
                  <th>Comisión</th>
                  <th>Cargo</th>
                  <th>Persona</th>
                  <th>Desde</th>
                  <th>Motivo</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas
                  .filter((f) => !comision || String(f.comision_id) === comision)
                  .map((f) => (
                    <tr key={f.asignacion_id}>
                      <td>{f.comision_sigla ?? f.comision_nombre}</td>
                      <td>{f.cargo_nombre}</td>
                      <td>
                        <Link to={`/personas/${f.persona_id}`} className="font-bold text-acento hover:underline">
                          {f.persona_nombre}
                        </Link>
                      </td>
                      <td className="tabular">{fechaHora(f.desde)}</td>
                      <td>{f.motivo && MOTIVO[f.motivo]}</td>
                      <td className="text-right">
                        <Boton variante="fantasma" onClick={() => setEditarId(f.persona_id!)}>
                          Editar
                        </Boton>
                        <Boton variante="fantasma" onClick={() => setMover({ personaId: f.persona_id!, nombre: f.persona_nombre! })}>
                          Mover
                        </Boton>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Tabla>
          )}
        </Consulta>
      </Tarjeta>
      {mover && <MoverModal key={mover.personaId} {...mover} onCerrar={() => setMover(null)} />}
      {editando && <EditarPersona key={editando.id} persona={editando} onCerrar={() => setEditarId(null)} />}
    </div>
  )
}

function ahoraLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

/** Mover a una persona. Si el cargo destino está ocupado, se propone intercambio o liberar al ocupante (todo en una transacción). */
function MoverModal({ personaId, nombre, onCerrar }: { personaId: string; nombre: string; onCerrar: () => void }) {
  const m = useMomento()
  const avisar = useAvisar()
  const comisiones = useComisiones()
  const cargos = useCargos()
  const vigentes = useVigentes()
  const mover = useMoverAsignaciones()
  const actual = vigentes.data?.find((v) => v.persona_id === personaId)
  const rotacionPermitida = m.abiertas.some((f) => f.permite_rotacion)
  const [destino, setDestino] = useState({ comision: '', cargo: '' })
  const [motivo, setMotivo] = useState<MotivoAsignacion>(actual ? (rotacionPermitida ? 'rotacion' : 'ajuste') : 'inicial')
  const [desde, setDesde] = useState(ahoraLocal)
  const [nota, setNota] = useState('')
  const [ocupanteVa, setOcupanteVa] = useState<'intercambio' | 'liberar'>('intercambio')

  const cargoSel = cargos.data?.find((c) => String(c.id) === destino.cargo)
  const ocupante = cargoSel?.unico_por_comision
    ? vigentes.data?.find((v) => String(v.comision_id) === destino.comision && String(v.cargo_id) === destino.cargo && v.persona_id !== personaId)
    : undefined

  const movimientos: Movimiento[] = [{ persona_id: personaId, comision_id: Number(destino.comision) || null, cargo_id: Number(destino.cargo) || null }]
  if (ocupante) {
    movimientos.push(
      ocupanteVa === 'intercambio' && actual
        ? { persona_id: ocupante.persona_id!, comision_id: actual.comision_id, cargo_id: actual.cargo_id }
        : { persona_id: ocupante.persona_id!, comision_id: null, cargo_id: null },
    )
  }

  return (
    <Modal
      abierto
      titulo={`${actual ? 'Mover' : 'Asignar'} a ${nombre}`}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={mover.isPending}
            disabled={!destino.comision || !destino.cargo || (motivo === 'rotacion' && !rotacionPermitida)}
            onClick={() =>
              mover.mutate(
                { movimientos, motivo, desde: new Date(desde).toISOString(), nota: nota.trim() || undefined },
                {
                  onSuccess: () => {
                    avisar('Asignación registrada.')
                    onCerrar()
                  },
                },
              )
            }
          >
            Confirmar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {actual && (
          <p className="text-sm text-ink-2">
            Ahora: <strong>{actual.comision_sigla ?? actual.comision_nombre}</strong> · {actual.cargo_nombre}. La asignación actual se cierra y su historial se conserva.
          </p>
        )}
        <SelectorDestino comisiones={comisiones.data ?? []} cargos={cargos.data ?? []} valor={destino} onCambio={setDestino} />
        {ocupante && (
          <fieldset className="flex flex-col gap-2 rounded-xl border border-amarillo p-3">
            <legend className="px-1 text-sm font-semibold">El cargo lo ocupa {ocupante.persona_nombre}</legend>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="ocupante" className="size-5" checked={ocupanteVa === 'intercambio'} disabled={!actual} onChange={() => setOcupanteVa('intercambio')} />
              Intercambiar: pasa al cargo que deja {nombre}
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="ocupante" className="size-5" checked={ocupanteVa === 'liberar' || !actual} onChange={() => setOcupanteVa('liberar')} />
              Dejarle sin asignación (se reasigna después)
            </label>
          </fieldset>
        )}
        <Selector etiqueta="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoAsignacion)}>
          {(['inicial', 'rotacion', 'ajuste'] as MotivoAsignacion[]).map((x) => (
            <option key={x} value={x} disabled={x === 'rotacion' && !rotacionPermitida}>
              {MOTIVO[x]}
              {x === 'rotacion' && !rotacionPermitida ? ' (la fase actual no permite rotación)' : ''}
            </option>
          ))}
        </Selector>
        <Campo etiqueta="Desde" type="datetime-local" value={desde} onChange={(e) => setDesde(e.target.value)} ayuda="Hora en que la persona empieza en el nuevo cargo." />
        <AreaTexto etiqueta="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
        {mover.isError && <Aviso tono="peligro">{mensajeError(mover.error)}</Aviso>}
      </div>
    </Modal>
  )
}

function SelectorDestino({
  comisiones,
  cargos,
  valor,
  onCambio,
  ambito,
}: {
  comisiones: Comision[]
  cargos: Cargo[]
  valor: { comision: string; cargo: string }
  onCambio: (v: { comision: string; cargo: string }) => void
  ambito?: Ambito
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Selector etiqueta="Comisión" value={valor.comision} onChange={(e) => onCambio({ ...valor, comision: e.target.value })}>
        <option value="">Elige…</option>
        {comisiones.map((c) => (
          <option key={c.id} value={c.id}>
            {siglaDe(c)}
          </option>
        ))}
      </Selector>
      <Selector etiqueta="Cargo" value={valor.cargo} onChange={(e) => onCambio({ ...valor, cargo: e.target.value })}>
        <option value="">Elige…</option>
        {cargos
          .filter((c) => !ambito || c.ambito === ambito)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
      </Selector>
    </div>
  )
}

// ───────────── Alta individual ─────────────
function AltaIndividual() {
  const avisar = useAvisar()
  const comisiones = useComisiones()
  const cargos = useCargos()
  const alta = useAltaPersonas()
  const vacio = { nombre: '', correo: '', ambito: 'mesa' as Ambito, comision: '', cargo: '' }
  const [f, setF] = useState(vacio)

  return (
    <Tarjeta titulo="Registrar una persona">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          alta.mutate(
            {
              personas: [
                {
                  nombre: f.nombre.trim(),
                  ambito: f.ambito,
                  correo: f.correo.trim() || null,
                  comision_id: Number(f.comision) || null,
                  cargo_id: Number(f.cargo) || null,
                },
              ],
            },
            {
              onSuccess: () => {
                avisar(`${f.nombre.trim()} registrada.`)
                setF({ ...vacio, ambito: f.ambito, comision: f.comision })
              },
            },
          )
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre completo" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} requerido />
          <Campo etiqueta="Correo (opcional)" type="email" value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} />
          <Selector etiqueta="Ámbito" value={f.ambito} onChange={(e) => setF({ ...f, ambito: e.target.value as Ambito, cargo: '' })}>
            <option value="mesa">{AMBITO.mesa}</option>
            <option value="eyc">{AMBITO.eyc}</option>
          </Selector>
        </div>
        <SelectorDestino
          comisiones={comisiones.data ?? []}
          cargos={cargos.data ?? []}
          ambito={f.ambito}
          valor={{ comision: f.comision, cargo: f.cargo }}
          onCambio={(v) => setF({ ...f, ...v })}
        />
        <p className="text-sm text-ink-3">Si eliges comisión y cargo, se crea también la asignación inicial desde este momento.</p>
        {alta.isError && <Aviso tono="peligro">{mensajeError(alta.error)}</Aviso>}
        <Boton type="submit" cargando={alta.isPending} disabled={f.nombre.trim().length < 2 || (!!f.comision !== !!f.cargo)} className="self-start">
          Registrar
        </Boton>
      </form>
    </Tarjeta>
  )
}

// ───────────── Carga masiva ─────────────
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

function CargaMasiva() {
  const avisar = useAvisar()
  const comisiones = useComisiones()
  const cargos = useCargos()
  const alta = useAltaPersonas()
  const [texto, setTexto] = useState('')

  const filas = useMemo(() => {
    const coms = comisiones.data ?? []
    const cars = cargos.data ?? []
    return texto
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((linea, i) => {
        const [nombre = '', com = '', car = '', correo = ''] = linea.split(/[;\t]/).map((x) => x.trim())
        const comision = com ? coms.find((c) => norm(c.clave) === norm(com) || (c.sigla && norm(c.sigla) === norm(com)) || norm(c.nombre) === norm(com)) : undefined
        const cargo = car ? cars.find((c) => norm(c.clave) === norm(car) || norm(c.nombre) === norm(car)) : undefined
        const errores: string[] = []
        if (nombre.length < 2) errores.push('nombre')
        if (com && !comision) errores.push(`comisión «${com}»`)
        if (car && !cargo) errores.push(`cargo «${car}»`)
        if (!!com !== !!car) errores.push('indica comisión y cargo juntos')
        const persona: AltaPersona = {
          nombre,
          ambito: cargo?.ambito ?? 'mesa',
          comision_id: comision?.id ?? null,
          cargo_id: cargo?.id ?? null,
          correo: correo || null,
        }
        return { i: i + 1, persona, comision, cargo, errores }
      })
  }, [texto, comisiones.data, cargos.data])

  const conError = filas.filter((f) => f.errores.length)

  return (
    <Tarjeta titulo="Carga masiva">
      <div className="flex flex-col gap-4">
        <Aviso tono="info" titulo="Formato: una persona por línea">
          <code className="font-cond">Nombre completo; comisión; cargo; correo</code>
          <span className="block">
            Comisión: clave o sigla (ctd, PNUD…). Cargo: director, adjunto1, adjunto2, aprendiz o eyc. Se puede pegar desde una hoja de cálculo (columnas separadas por tabulador). Se
            registra todo o nada.
          </span>
        </Aviso>
        <AreaTexto etiqueta="Personas" rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'Ana Pérez; ctd; director\nLuis Gómez; ctd; adjunto1'} />
        {filas.length > 0 && (
          <Tabla etiqueta="Vista previa de la carga">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Comisión</th>
                <th>Cargo</th>
                <th>Revisión</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.i}>
                  <td className="tabular">{f.i}</td>
                  <td>{f.persona.nombre}</td>
                  <td>{f.comision ? siglaDe(f.comision) : '—'}</td>
                  <td>{f.cargo?.nombre ?? '—'}</td>
                  <td>{f.errores.length ? <Insignia tono="peligro">Revisar: {f.errores.join(', ')}</Insignia> : <Insignia tono="exito">Lista</Insignia>}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
        {alta.isError && <Aviso tono="peligro">{mensajeError(alta.error)}</Aviso>}
        <Boton
          className="self-start"
          cargando={alta.isPending}
          disabled={!filas.length || conError.length > 0}
          onClick={() =>
            alta.mutate(
              { personas: filas.map((f) => f.persona) },
              {
                onSuccess: (n) => {
                  avisar(`${n} personas registradas.`)
                  setTexto('')
                },
              },
            )
          }
        >
          Registrar {filas.length || ''} {filas.length === 1 ? 'persona' : 'personas'}
        </Boton>
      </div>
    </Tarjeta>
  )
}
