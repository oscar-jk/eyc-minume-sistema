import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { Campo } from '@/components/Campo'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Modal } from '@/components/Modal'
import { Acento, Aviso, Insignia, Tarjeta, Titulo } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { mensajeError } from '@/lib/errores'
import { fecha, plural } from '@/lib/formato'
import { useActivarFormulario, useBorrarFormulario, useCrearFormulario, useFormularios } from './api'
import { enlacePublico } from './tipos'

/** Lista de formularios: cada quien ve los suyos; Subsecretaría, Secretaría General y administración ven todos. */
export function FormulariosPage() {
  const { perfil } = useSesion()
  const q = useFormularios()
  const crear = useCrearFormulario()
  const activar = useActivarFormulario()
  const borrar = useBorrarFormulario()
  const avisar = useAvisar()
  const nav = useNavigate()
  const [nuevo, setNuevo] = useState<string | null>(null)
  const [aBorrar, setABorrar] = useState<{ id: string; titulo: string; envios: number } | null>(null)
  const ve = perfil?.rol === 'subsecretario' || perfil?.rol === 'secretario' || perfil?.rol === 'admin'

  return (
    <>
      <Titulo sobre="Recoger opiniones" adorno="bloques" sub="Crea formularios con distintos tipos de campos y comparte un enlace: quien responde no necesita cuenta." accion={<Boton variante="claro" onClick={() => setNuevo('')}>Nuevo formulario</Boton>}>
        Formula<Acento>rios</Acento>
      </Titulo>

      <Consulta
        q={q}
        vacio={
          <EstadoVacio titulo="Todavía no hay formularios" accion={<Boton onClick={() => setNuevo('')}>Crear el primero</Boton>}>
            Por ejemplo, el feedback de una sesión: se elige el rol (delegado, mesa, aprendiz…), la comisión y se responde.
          </EstadoVacio>
        }
      >
        {(fs) => (
          <Tarjeta titulo={ve ? 'Todos los formularios' : 'Mis formularios'}>
            <ul className="flex flex-col gap-2">
              {fs.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-accent hover:shadow-card dark:bg-white/[0.04]">
                  <div className="min-w-0 flex-1 basis-[14rem]">
                    <Link to={`/formularios/${f.id}`} className="font-bold hover:underline">
                      {f.titulo}
                    </Link>
                    <p className="font-cond text-sm text-ink-3">
                      Creado el {fecha(f.creado_en)} · {plural(f.envios, 'respuesta', 'respuestas')}
                    </p>
                  </div>
                  {f.activo ? <Insignia tono="exito">Recibiendo</Insignia> : <Insignia>Cerrado</Insignia>}
                  <Boton variante="secundario" onClick={() => nav(`/formularios/${f.id}/resultados`)}>
                    Resultados
                  </Boton>
                  <Boton variante="fantasma" onClick={() => nav(`/formularios/${f.id}`)}>
                    Editar
                  </Boton>
                  <Boton
                    variante="fantasma"
                    onClick={() =>
                      navigator.clipboard.writeText(enlacePublico(f.codigo)).then(
                        () => avisar('Enlace copiado.'),
                        () => avisar('No se pudo copiar el enlace.', 'error'),
                      )
                    }
                  >
                    Copiar enlace
                  </Boton>
                  <Boton
                    variante="fantasma"
                    cargando={activar.isPending && activar.variables?.id === f.id}
                    onClick={() => activar.mutate({ id: f.id, activo: !f.activo }, { onSuccess: () => avisar(f.activo ? 'Formulario cerrado: ya no recibe respuestas.' : 'Formulario abierto.'), onError: (e) => avisar(mensajeError(e), 'error') })}
                  >
                    {f.activo ? 'Cerrar' : 'Abrir'}
                  </Boton>
                  <Boton variante="fantasma" className="text-danger" onClick={() => setABorrar({ id: f.id, titulo: f.titulo, envios: f.envios })}>
                    Eliminar
                  </Boton>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
      </Consulta>

      <Modal
        abierto={nuevo !== null}
        titulo="Nuevo formulario"
        onCerrar={() => setNuevo(null)}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setNuevo(null)}>
              Cancelar
            </Boton>
            <Boton
              cargando={crear.isPending}
              disabled={(nuevo ?? '').trim().length < 2}
              onClick={() => crear.mutate({ titulo: nuevo! }, { onSuccess: (id) => nav(`/formularios/${id}`), onError: (e) => avisar(mensajeError(e), 'error') })}
            >
              Crear y diseñar
            </Boton>
          </>
        }
      >
        <Campo etiqueta="Título" requerido value={nuevo ?? ''} onChange={(e) => setNuevo(e.target.value)} placeholder="Ej.: Feedback de la sesión" />
      </Modal>

      <Modal
        abierto={!!aBorrar}
        titulo="Eliminar formulario"
        onCerrar={() => setABorrar(null)}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setABorrar(null)}>
              Cancelar
            </Boton>
            <Boton
              variante="peligro"
              cargando={borrar.isPending}
              onClick={() => borrar.mutate(aBorrar!.id, { onSuccess: () => (avisar('Formulario eliminado.'), setABorrar(null)), onError: (e) => avisar(mensajeError(e), 'error') })}
            >
              Eliminar definitivamente
            </Boton>
          </>
        }
      >
        <p>
          Vas a eliminar <strong>{aBorrar?.titulo}</strong>
          {aBorrar && aBorrar.envios > 0 ? ` y sus ${plural(aBorrar.envios, 'respuesta', 'respuestas')}` : ''}. Esto no se puede deshacer.
        </p>
        {aBorrar && aBorrar.envios > 0 && (
          <div className="mt-3">
            <Aviso tono="alerta">Si solo quieres dejar de recibir respuestas, usa «Cerrar»: los resultados se conservan.</Aviso>
          </div>
        )}
      </Modal>
    </>
  )
}
