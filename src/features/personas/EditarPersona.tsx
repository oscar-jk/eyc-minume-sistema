import { useState } from 'react'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { AreaTexto, Campo } from '@/components/Campo'
import { Modal } from '@/components/Modal'
import { Aviso } from '@/components/Ui'
import { mensajeError } from '@/lib/errores'
import type { Persona } from '@/lib/tipos'
import { useEditarPersona } from './api'

/** Edita los datos de identidad de una persona (nombre, correo, notas). El cargo y la comisión se cambian con «Mover». */
export function EditarPersona({ persona, onCerrar }: { persona: Pick<Persona, 'id' | 'nombre' | 'correo' | 'notas'>; onCerrar: () => void }) {
  const avisar = useAvisar()
  const m = useEditarPersona()
  const [f, setF] = useState({ nombre: persona.nombre, correo: persona.correo ?? '', notas: persona.notas ?? '' })
  return (
    <Modal
      abierto
      titulo="Editar datos de la persona"
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={m.isPending}
            disabled={f.nombre.trim().length < 2}
            onClick={() =>
              m.mutate(
                { id: persona.id, nombre: f.nombre.trim(), correo: f.correo.trim() || null, notas: f.notas.trim() || null },
                { onSuccess: () => (avisar('Datos actualizados.'), onCerrar()) },
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
        <Campo etiqueta="Correo" type="email" value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} />
        <AreaTexto etiqueta="Notas internas" value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
        <p className="text-sm text-ink-3">Para cambiar de comisión o cargo usa «Mover» en Personas → Asignaciones; así se conserva el historial.</p>
        {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
      </div>
    </Modal>
  )
}
