import { useState } from 'react'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { Campo, Selector } from '@/components/Campo'
import { Modal } from '@/components/Modal'
import { Aviso } from '@/components/Ui'
import { mensajeError } from '@/lib/errores'
import { TIPO_ACTIVIDAD } from '@/lib/formato'
import type { Actividad, TipoActividad } from '@/lib/tipos'
import { useEditarActividad } from './api'

export function EditarActividad({ actividad, max, onCerrar }: { actividad: Actividad; max?: string; onCerrar: () => void }) {
  const avisar = useAvisar()
  const m = useEditarActividad()
  const [f, setF] = useState({ nombre: actividad.nombre, tipo: actividad.tipo, fecha: actividad.fecha })
  return (
    <Modal
      abierto
      titulo="Editar actividad"
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={m.isPending}
            disabled={f.nombre.trim().length < 2 || !f.fecha}
            onClick={() => m.mutate({ id: actividad.id, ...f, nombre: f.nombre.trim() }, { onSuccess: () => (avisar('Actividad actualizada.'), onCerrar()) })}
          >
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Nombre" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} requerido />
        <Selector etiqueta="Tipo" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as TipoActividad })}>
          {Object.entries(TIPO_ACTIVIDAD).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Selector>
        <Campo etiqueta="Fecha" type="date" max={max} value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} requerido />
        {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
      </div>
    </Modal>
  )
}
