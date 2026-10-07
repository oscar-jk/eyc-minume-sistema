import { useState } from 'react'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { AreaTexto, Campo } from '@/components/Campo'
import { Consulta } from '@/components/Estados'
import { Modal } from '@/components/Modal'
import { Aviso, Insignia, Tarjeta } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { siglaDe, useCargos, useComisiones, useEditarCargo, useEditarComision } from '@/features/comisiones/api'
import { mensajeError } from '@/lib/errores'
import { AMBITO } from '@/lib/formato'
import type { Cargo, Comision, Dimension } from '@/lib/tipos'
import { useDimensiones, useEditarDimension } from './api'

/** Catálogos editables: comisiones y cargos (admin), dimensiones (Subsecretaría y admin). */
export function CatalogosPanel() {
  const { perfil } = useSesion()
  const admin = perfil?.rol === 'admin'
  return (
    <div className="flex flex-col gap-5">
      {!admin && <Aviso tono="info">Las comisiones y los cargos solo los edita un administrador. Tú puedes editar las dimensiones.</Aviso>}
      <ComisionesEditables editable={admin} />
      <CargosEditables editable={admin} />
      <DimensionesEditables />
    </div>
  )
}

export function ComisionesEditables({ editable }: { editable: boolean }) {
  const q = useComisiones()
  const [editar, setEditar] = useState<Comision | null>(null)
  return (
    <Tarjeta titulo="Comisiones">
      <Consulta q={q}>
        {(cs) => (
          <ul className="grid gap-2 sm:grid-cols-2">
            {cs.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 dark:bg-white/[0.04]">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl rounded-tr-sm bg-grad-primario font-cond text-xs font-extrabold text-white">
                  {(c.sigla ?? c.clave).slice(0, 5).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{siglaDe(c)}</span>
                  <span className="block truncate text-sm text-ink-3">{c.nombre}</span>
                </span>
                {!c.activa && <Insignia tono="alerta">Inactiva</Insignia>}
                {editable && (
                  <Boton variante="secundario" className="min-h-9 px-3" onClick={() => setEditar(c)}>
                    Editar
                  </Boton>
                )}
              </li>
            ))}
          </ul>
        )}
      </Consulta>
      {editar && <EditarComision key={editar.id} comision={editar} onCerrar={() => setEditar(null)} />}
    </Tarjeta>
  )
}

export function EditarComision({ comision, onCerrar }: { comision: Comision; onCerrar: () => void }) {
  const avisar = useAvisar()
  const m = useEditarComision()
  const [f, setF] = useState({ nombre: comision.nombre, sigla: comision.sigla ?? '', activa: comision.activa })
  return (
    <Modal
      abierto
      titulo={`Editar ${siglaDe(comision)}`}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={m.isPending}
            disabled={f.nombre.trim().length < 3}
            onClick={() =>
              m.mutate(
                { id: comision.id, nombre: f.nombre.trim(), sigla: f.sigla.trim() || null, activa: f.activa },
                {
                  onSuccess: () => {
                    avisar('Comisión actualizada.')
                    onCerrar()
                  },
                },
              )
            }
          >
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Nombre completo" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} requerido />
        <Campo etiqueta="Sigla" value={f.sigla} onChange={(e) => setF({ ...f, sigla: e.target.value })} ayuda="Déjala vacía si aún está por definir." />
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={f.activa} onChange={(e) => setF({ ...f, activa: e.target.checked })} />
          Comisión activa (las inactivas no aparecen en cobertura)
        </label>
        <p className="text-sm text-ink-3">Clave interna: {comision.clave} (no cambia, la usa la carga masiva).</p>
        {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
      </div>
    </Modal>
  )
}

function CargosEditables({ editable }: { editable: boolean }) {
  const q = useCargos()
  const [editar, setEditar] = useState<Cargo | null>(null)
  return (
    <Tarjeta titulo="Cargos">
      <Consulta q={q}>
        {(cs) => (
          <ul className="flex flex-col gap-2">
            {cs.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 dark:bg-white/[0.04]">
                <span className="min-w-0 flex-1 basis-[12rem] font-bold">{c.nombre}</span>
                <Insignia>{AMBITO[c.ambito]}</Insignia>
                <Insignia tono="acento">clave: {c.clave}</Insignia>
                {editable && (
                  <Boton variante="secundario" className="min-h-9 px-3" onClick={() => setEditar(c)}>
                    Renombrar
                  </Boton>
                )}
              </li>
            ))}
          </ul>
        )}
      </Consulta>
      {editar && <EditarCargo key={editar.id} cargo={editar} onCerrar={() => setEditar(null)} />}
    </Tarjeta>
  )
}

function EditarCargo({ cargo, onCerrar }: { cargo: Cargo; onCerrar: () => void }) {
  const avisar = useAvisar()
  const m = useEditarCargo()
  const [nombre, setNombre] = useState(cargo.nombre)
  return (
    <Modal
      abierto
      titulo={`Renombrar ${cargo.nombre}`}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={m.isPending}
            disabled={nombre.trim().length < 3}
            onClick={() => m.mutate({ id: cargo.id, nombre: nombre.trim() }, { onSuccess: () => (avisar('Cargo actualizado.'), onCerrar()) })}
          >
            Guardar
          </Boton>
        </>
      }
    >
      <Campo etiqueta="Nombre visible" value={nombre} onChange={(e) => setNombre(e.target.value)} requerido />
      {m.isError && (
        <div className="mt-3">
          <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>
        </div>
      )}
    </Modal>
  )
}

function DimensionesEditables() {
  const q = useDimensiones()
  const [editar, setEditar] = useState<Dimension | null>(null)
  return (
    <Tarjeta titulo="Dimensiones de la rúbrica">
      <Consulta q={q}>
        {(ds) => (
          <ul className="grid gap-3 md:grid-cols-2">
            {ds.map((d) => (
              <li key={d.id} className="flex gap-3 rounded-2xl border border-line bg-surface p-4 dark:bg-white/[0.04]">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl rounded-tr-sm bg-grad-primario font-cond text-xl font-extrabold text-white">{d.clave}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{d.nombre}</span>
                  <span className="block text-sm text-ink-3">{d.competencias}</span>
                </span>
                <Boton variante="secundario" className="min-h-9 self-start px-3" onClick={() => setEditar(d)}>
                  Editar
                </Boton>
              </li>
            ))}
          </ul>
        )}
      </Consulta>
      {editar && <EditarDimension key={editar.id} dimension={editar} onCerrar={() => setEditar(null)} />}
    </Tarjeta>
  )
}

function EditarDimension({ dimension, onCerrar }: { dimension: Dimension; onCerrar: () => void }) {
  const avisar = useAvisar()
  const m = useEditarDimension()
  const [f, setF] = useState({ nombre: dimension.nombre, competencias: dimension.competencias })
  return (
    <Modal
      abierto
      titulo={`Dimensión ${dimension.clave}`}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={m.isPending}
            disabled={f.nombre.trim().length < 3}
            onClick={() =>
              m.mutate(
                { id: dimension.id, nombre: f.nombre.trim(), competencias: f.competencias.trim() },
                { onSuccess: () => (avisar('Dimensión actualizada.'), onCerrar()) },
              )
            }
          >
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Nombre" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} requerido />
        <AreaTexto etiqueta="Competencias que mide" value={f.competencias} onChange={(e) => setF({ ...f, competencias: e.target.value })} />
        {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
      </div>
    </Modal>
  )
}
