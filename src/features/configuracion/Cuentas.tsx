import { useState } from 'react'
import { useAvisar } from '@/components/Avisos'
import { Boton } from '@/components/Boton'
import { Campo, Selector } from '@/components/Campo'
import { Consulta, EstadoVacio } from '@/components/Estados'
import { Modal } from '@/components/Modal'
import { Aviso, Insignia, Tabla, Tarjeta } from '@/components/Ui'
import { useSesion } from '@/features/auth/AuthProvider'
import { siglaDe, useComisiones } from '@/features/comisiones/api'
import { mensajeError } from '@/lib/errores'
import { ROL, fechaHora } from '@/lib/formato'
import type { Perfil, Rol } from '@/lib/tipos'
import { useActivarCuenta, useActualizarPerfil, useAuditoria, useCrearCuenta, useEnlaceAcceso, usePerfiles } from './api'

const ROLES: Rol[] = ['eyc', 'subsecretario', 'secretario', 'admin']

/** Muestra un enlace de acceso para compartir por un canal privado (no viaja por correo si no hay SMTP). */
function EnlaceModal({ enlace, onCerrar }: { enlace: string | null; onCerrar: () => void }) {
  const avisar = useAvisar()
  return (
    <Modal
      abierto={!!enlace}
      titulo="Enlace de acceso"
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton
            variante="secundario"
            onClick={() =>
              navigator.clipboard.writeText(enlace ?? '').then(
                () => avisar('Enlace copiado.'),
                () => avisar('No se pudo copiar; selecciónalo manualmente.', 'error'),
              )
            }
          >
            Copiar
          </Boton>
          <Boton onClick={onCerrar}>Listo</Boton>
        </>
      }
    >
      <p className="mb-2 text-sm text-ink-2">Envíalo solo a la persona dueña de la cuenta. Con él define su contraseña personal. Es de un solo uso y caduca.</p>
      <textarea readOnly rows={4} value={enlace ?? ''} className="w-full rounded-lg border border-line-strong bg-surface-2 p-2 font-mono text-xs" onFocus={(e) => e.target.select()} />
    </Modal>
  )
}

export function CuentasPanel() {
  const { perfil: yo } = useSesion()
  const perfiles = usePerfiles()
  const comisiones = useComisiones()
  const crear = useCrearCuenta()
  const enlace = useEnlaceAcceso()
  const activar = useActivarCuenta()
  const actualizar = useActualizarPerfil()
  const avisar = useAvisar()
  const [nueva, setNueva] = useState({ email: '', nombre: '', rol: 'eyc' as Rol, comision: '' })
  const [link, setLink] = useState<string | null>(null)
  const [editar, setEditar] = useState<Perfil | null>(null)

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta titulo="Crear cuenta individual">
        <p className="mb-3 text-sm text-ink-2">Una cuenta por persona, nunca compartida por comisión. La persona define su propia contraseña con el enlace que se genera.</p>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_1fr_1fr_auto] lg:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            crear.mutate(
              { email: nueva.email, nombre: nueva.nombre, rol: nueva.rol, comision_id: nueva.rol === 'eyc' ? Number(nueva.comision) : null },
              {
                onSuccess: (r) => {
                  setLink(r.enlace)
                  setNueva({ email: '', nombre: '', rol: nueva.rol, comision: nueva.comision })
                },
              },
            )
          }}
        >
          <Campo etiqueta="Nombre" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} requerido />
          <Campo etiqueta="Correo" type="email" value={nueva.email} onChange={(e) => setNueva({ ...nueva, email: e.target.value })} requerido />
          <Selector etiqueta="Rol" value={nueva.rol} onChange={(e) => setNueva({ ...nueva, rol: e.target.value as Rol })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROL[r]}
              </option>
            ))}
          </Selector>
          <Selector etiqueta="Comisión" value={nueva.comision} disabled={nueva.rol !== 'eyc'} onChange={(e) => setNueva({ ...nueva, comision: e.target.value })}>
            <option value="">{nueva.rol === 'eyc' ? 'Elige…' : 'No aplica'}</option>
            {comisiones.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {siglaDe(c)}
              </option>
            ))}
          </Selector>
          <Boton type="submit" cargando={crear.isPending} disabled={!nueva.email || nueva.nombre.trim().length < 2 || (nueva.rol === 'eyc' && !nueva.comision)}>
            Crear
          </Boton>
          {crear.isError && (
            <div className="sm:col-span-2 lg:col-span-5">
              <Aviso tono="peligro">{mensajeError(crear.error)}</Aviso>
            </div>
          )}
        </form>
      </Tarjeta>

      <Tarjeta titulo="Cuentas">
        <Consulta q={perfiles} vacio={<EstadoVacio titulo="Sin cuentas" />}>
          {(ps) => (
            <Tabla etiqueta="Cuentas del sistema">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Comisión</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ps.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.nombre}</td>
                    <td>{p.email}</td>
                    <td>{p.rol ? ROL[p.rol] : <Insignia tono="alerta">Sin rol</Insignia>}</td>
                    <td>{siglaDe(comisiones.data?.find((c) => c.id === p.comision_id))}</td>
                    <td>{p.activo ? <Insignia tono="exito">Activa</Insignia> : <Insignia tono="peligro">Bloqueada</Insignia>}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Boton variante="fantasma" onClick={() => setEditar(p)}>
                          Editar
                        </Boton>
                        <Boton
                          variante="fantasma"
                          cargando={enlace.isPending && enlace.variables === p.email}
                          onClick={() => enlace.mutate(p.email, { onSuccess: (r) => setLink(r.enlace), onError: (e) => avisar(mensajeError(e), 'error') })}
                        >
                          Enlace
                        </Boton>
                        {p.id !== yo?.id && (
                          <Boton
                            variante="fantasma"
                            onClick={() =>
                              activar.mutate(
                                { user_id: p.id, activo: !p.activo },
                                { onSuccess: () => avisar(p.activo ? 'Cuenta bloqueada.' : 'Cuenta activada.'), onError: (e) => avisar(mensajeError(e), 'error') },
                              )
                            }
                          >
                            {p.activo ? 'Bloquear' : 'Activar'}
                          </Boton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Consulta>
      </Tarjeta>
      <EnlaceModal enlace={link} onCerrar={() => setLink(null)} />
      {editar && (
        <EditarPerfil
          key={editar.id}
          perfil={editar}
          onCerrar={() => setEditar(null)}
          onGuardar={(p) =>
            actualizar.mutate(p, {
              onSuccess: () => {
                avisar('Cuenta actualizada.')
                setEditar(null)
              },
              onError: (e) => avisar(mensajeError(e), 'error'),
            })
          }
          guardando={actualizar.isPending}
        />
      )}
    </div>
  )
}

function EditarPerfil({
  perfil,
  onCerrar,
  onGuardar,
  guardando,
}: {
  perfil: Perfil
  onCerrar: () => void
  onGuardar: (p: { id: string; nombre: string; rol: Rol | null; comision_id: number | null }) => void
  guardando: boolean
}) {
  const comisiones = useComisiones()
  const [p, setP] = useState({ nombre: perfil.nombre, rol: perfil.rol ?? ('' as Rol | ''), comision: perfil.comision_id ? String(perfil.comision_id) : '' })
  return (
    <Modal
      abierto
      titulo={`Editar ${perfil.email}`}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={guardando}
            disabled={p.rol === 'eyc' && !p.comision}
            onClick={() => onGuardar({ id: perfil.id, nombre: p.nombre.trim(), rol: p.rol || null, comision_id: p.rol === 'eyc' ? Number(p.comision) : null })}
          >
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Nombre" value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} />
        <Selector etiqueta="Rol" value={p.rol} onChange={(e) => setP({ ...p, rol: e.target.value as Rol | '' })}>
          <option value="">Sin rol (sin acceso)</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROL[r]}
            </option>
          ))}
        </Selector>
        {p.rol === 'eyc' && (
          <Selector etiqueta="Comisión" value={p.comision} onChange={(e) => setP({ ...p, comision: e.target.value })} requerido>
            <option value="">Elige…</option>
            {comisiones.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {siglaDe(c)}
              </option>
            ))}
          </Selector>
        )}
      </div>
    </Modal>
  )
}

const ACCION: Record<string, string> = { insert: 'Alta', update: 'Cambio', delete: 'Baja' }

export function AuditoriaPanel() {
  const [tabla, setTabla] = useState('')
  const q = useAuditoria(tabla || undefined)
  const perfiles = usePerfiles()
  const nombre = (id: string | null) => perfiles.data?.find((p) => p.id === id)?.nombre ?? (id ? 'Usuario' : 'Sistema')
  return (
    <Tarjeta
      titulo="Auditoría (últimos 100 cambios)"
      accion={
        <Selector etiqueta="Tabla" value={tabla} onChange={(e) => setTabla(e.target.value)} className="min-w-52">
          <option value="">Todas</option>
          {['evaluaciones', 'respuestas', 'recomendaciones', 'decisiones', 'asignaciones', 'personas', 'fases', 'cortes', 'pesos_dimension', 'criterios', 'config', 'perfiles'].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Selector>
      }
    >
      <Consulta q={q} vacio={<EstadoVacio titulo="Sin cambios registrados" />}>
        {(filas) => (
          <ul className="flex flex-col gap-2">
            {filas.map((a) => (
              <li key={a.id} className="rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-accent hover:shadow-card dark:bg-white/[0.04] text-sm">
                <p>
                  <strong>{ACCION[a.accion] ?? a.accion}</strong> en <code className="font-cond">{a.tabla}</code> · {nombre(a.autor)} · {fechaHora(a.fecha)}
                </p>
                <details className="mt-1">
                  <summary className="cursor-pointer text-accent">Valores</summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <pre className="overflow-x-auto rounded-lg bg-surface-2 p-2 text-xs">{a.antes ? JSON.stringify(a.antes, null, 1) : '—'}</pre>
                    <pre className="overflow-x-auto rounded-lg bg-surface-2 p-2 text-xs">{a.despues ? JSON.stringify(a.despues, null, 1) : '—'}</pre>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Consulta>
    </Tarjeta>
  )
}
