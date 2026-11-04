import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { Campo, Selector } from '@/components/Campo'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Modal } from '@/components/Modal'
import { Acento, Aviso, Insignia, Tarjeta, Titulo } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { useComisiones } from '@/features/comisiones/api'
import { mensajeError } from '@/lib/errores'
import { ROL, fecha, plural } from '@/lib/formato'
import { useActivarFormulario, useBorrarFormulario, useCrearFormulario, useDuplicarFormulario, useFormularios } from './api'
import { CompartirFormulario } from './CompartirFormulario'
import { enlacePublico, ROLES_RESPUESTA } from './tipos'

/** Lista de formularios: cada quien ve los suyos; Subsecretaría, Secretaría General y administración ven todos. */
export function FormulariosPage({ embebido = false }: { embebido?: boolean }) {
  const { perfil } = useSesion()
  const q = useFormularios()
  const crear = useCrearFormulario()
  const activar = useActivarFormulario()
  const borrar = useBorrarFormulario()
  const duplicar = useDuplicarFormulario()
  const avisar = useAvisar()
  const nav = useNavigate()
  const [nuevo, setNuevo] = useState<string | null>(null)
  const [compartir, setCompartir] = useState<{ titulo: string; codigo: string } | null>(null)
  const [aBorrar, setABorrar] = useState<{ id: string; titulo: string; envios: number } | null>(null)
  const ve = perfil?.rol === 'subsecretario' || perfil?.rol === 'secretario' || perfil?.rol === 'admin'
  const comisiones = useComisiones()
  const [filtro, setFiltro] = useState({ texto: '', autor: '', creador: '', alcance: '', dirigido: '', estado: '' })
  const cambiar = (k: keyof typeof filtro, v: string) => setFiltro((f) => ({ ...f, [k]: v }))
  const siglaDe = useMemo(() => new Map((comisiones.data ?? []).map((c) => [c.id, c.sigla ?? c.clave.toUpperCase()])), [comisiones.data])
  const hayFiltro = Object.values(filtro).some(Boolean)

  return (
    <>
      {embebido ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 basis-[16rem] text-ink-2">Crea formularios con distintos tipos de campos y comparte un enlace: quien responde no necesita cuenta.</p>
          <Boton onClick={() => setNuevo('')}>Nuevo formulario</Boton>
        </div>
      ) : (
        <Titulo sobre="Recoger opiniones" adorno="bloques" sub="Crea formularios con distintos tipos de campos y comparte un enlace: quien responde no necesita cuenta." accion={<Boton variante="claro" onClick={() => setNuevo('')}>Nuevo formulario</Boton>}>
          Formula<Acento>rios</Acento>
        </Titulo>
      )}

      <Consulta
        q={q}
        vacio={
          <EstadoVacio titulo="Todavía no hay formularios" accion={<Boton onClick={() => setNuevo('')}>Crear el primero</Boton>}>
            Por ejemplo, el feedback de una sesión: se elige el rol (delegado, mesa, aprendiz…), la comisión y se responde.
          </EstadoVacio>
        }
      >
        {(todos) => {
          const alcanceDe = (f: (typeof todos)[number]) => (f.comision_fija != null ? `Solo ${siglaDe.get(f.comision_fija) ?? 'una comisión'}` : f.pide_comision ? 'Cualquier comisión (la elige quien responde)' : 'Sin comisión')
          const fs = todos.filter((f) => {
            if (filtro.texto && !f.titulo.toLowerCase().includes(filtro.texto.trim().toLowerCase())) return false
            if (filtro.autor && (f.autor?.rol ?? 'desconocido') !== filtro.autor) return false
            if (filtro.creador && f.creado_por !== filtro.creador) return false
            if (filtro.alcance === 'libre' && !(f.comision_fija == null && f.pide_comision)) return false
            if (filtro.alcance === 'sin' && !(f.comision_fija == null && !f.pide_comision)) return false
            if (filtro.alcance.startsWith('c:') && String(f.comision_fija) !== filtro.alcance.slice(2)) return false
            if (filtro.dirigido && !(f.roles.length === 0 ? filtro.dirigido === 'todos' : f.roles.includes(filtro.dirigido))) return false
            if (filtro.estado === 'abiertos' && !f.activo) return false
            if (filtro.estado === 'cerrados' && f.activo) return false
            return true
          })
          const porCreador = new Map<string, { id: string; nombre: string; rol: string; n: number }>()
          for (const f of todos) {
            if (!f.creado_por || !f.autor) continue
            const c = porCreador.get(f.creado_por)
            if (c) c.n++
            else porCreador.set(f.creado_por, { id: f.creado_por, nombre: f.autor.nombre, rol: f.autor.rol, n: 1 })
          }
          const creadores = [...porCreador.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
          return (
          <Tarjeta titulo={ve ? 'Todos los formularios' : 'Mis formularios'}>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo filtro etiqueta="Buscar por título" value={filtro.texto} onChange={(e) => cambiar('texto', e.target.value)} placeholder="Ej.: capacitaciones" />
              {embebido && ve && (
                <Selector filtro etiqueta="Creador" value={filtro.creador} onChange={(e) => cambiar('creador', e.target.value)}>
                  <option value="">Cualquier persona</option>
                  {creadores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({ROL[c.rol as keyof typeof ROL] ?? c.rol}) · {plural(c.n, 'formulario', 'formularios')}
                    </option>
                  ))}
                </Selector>
              )}
              {embebido && ve && (
                <Selector filtro etiqueta="Creado por (rol)" value={filtro.autor} onChange={(e) => cambiar('autor', e.target.value)}>
                  <option value="">Cualquiera</option>
                  {(Object.keys(ROL) as (keyof typeof ROL)[]).map((r) => (
                    <option key={r} value={r}>
                      {ROL[r]}
                    </option>
                  ))}
                </Selector>
              )}
              <Selector filtro etiqueta="Alcance (comisión)" value={filtro.alcance} onChange={(e) => cambiar('alcance', e.target.value)}>
                <option value="">Todos</option>
                <option value="libre">Cualquier comisión (la elige quien responde)</option>
                <option value="sin">Sin comisión</option>
                {(comisiones.data ?? []).map((c) => (
                  <option key={c.id} value={`c:${c.id}`}>
                    Solo {c.sigla ?? c.clave.toUpperCase()}
                  </option>
                ))}
              </Selector>
              <Selector filtro etiqueta="Dirigido a" value={filtro.dirigido} onChange={(e) => cambiar('dirigido', e.target.value)}>
                <option value="">Cualquiera</option>
                <option value="todos">Sin restricción de rol</option>
                {Object.entries(ROLES_RESPUESTA).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Selector>
              <Selector filtro etiqueta="Estado" value={filtro.estado} onChange={(e) => cambiar('estado', e.target.value)}>
                <option value="">Todos</option>
                <option value="abiertos">Recibiendo respuestas</option>
                <option value="cerrados">Cerrados</option>
              </Selector>
              {hayFiltro && (
                <div className="flex items-end">
                  <Boton variante="fantasma" onClick={() => setFiltro({ texto: '', autor: '', creador: '', alcance: '', dirigido: '', estado: '' })}>
                    Quitar filtros
                  </Boton>
                </div>
              )}
            </div>
            <p className="mb-2 font-cond text-sm text-ink-3" aria-live="polite">
              {hayFiltro ? `${fs.length} de ${todos.length}` : plural(todos.length, 'formulario', 'formularios')}
            </p>
            {fs.length === 0 && <p className="rounded-2xl border border-dashed border-line p-6 text-center text-ink-2">Ningún formulario coincide con esos filtros.</p>}
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
                    <p className="font-cond text-sm text-ink-3">
                      {f.autor ? `Por ${f.autor.nombre} (${ROL[f.autor.rol as keyof typeof ROL] ?? f.autor.rol})` : 'Autor no disponible'} · {alcanceDe(f)} ·{' '}
                      {f.roles.length ? `Para: ${f.roles.map((r) => ROLES_RESPUESTA[r] ?? r).join(', ')}` : 'Para cualquier rol'}
                    </p>
                  </div>
                  {f.activo ? <Insignia tono="exito">Recibiendo</Insignia> : <Insignia>Cerrado</Insignia>}
                  <Boton variante="secundario" onClick={() => nav(`/formularios/${f.id}/resultados`)}>
                    Resultados
                  </Boton>
                  <Boton variante="fantasma" onClick={() => nav(`/formularios/${f.id}`)}>
                    Editar
                  </Boton>
                  <Boton variante="secundario" onClick={() => setCompartir({ titulo: f.titulo, codigo: f.codigo })}>
                    Compartir
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
                    cargando={duplicar.isPending && duplicar.variables?.id === f.id}
                    onClick={() =>
                      duplicar.mutate(
                        { id: f.id },
                        { onSuccess: (id) => (avisar('Copia creada: está cerrada hasta que la abras. Cambia el título y la comisión si hace falta.'), nav(`/formularios/${id}`)), onError: (e) => avisar(mensajeError(e), 'error') },
                      )
                    }
                  >
                    Duplicar
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
          )
        }}
      </Consulta>

      {compartir && <CompartirFormulario titulo={compartir.titulo} codigo={compartir.codigo} onCerrar={() => setCompartir(null)} />}

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
