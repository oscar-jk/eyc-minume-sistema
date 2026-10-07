import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Boton } from '@/components/Boton'
import { Campo } from '@/components/Campo'
import { Marca } from '@/components/Marca'
import { Aviso } from '@/components/Ui'
import { mensajeError } from '@/lib/errores'
import { cambiarContrasena, entrar, solicitarRecuperacion } from './api'
import { useSesion } from './AuthProvider'

function Marco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Marca tipo="login" className="h-auto w-64" />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <p className="font-cond text-sm font-semibold uppercase tracking-wider text-accent">Evaluación y Control</p>
          <h1 className="mb-5 mt-1 text-2xl font-bold">{titulo}</h1>
          {children}
        </div>
      </div>
    </main>
  )
}

export function LoginPage() {
  const { sesion, recuperando } = useSesion()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const m = useMutation({ mutationFn: () => entrar(email, password) })

  if (recuperando) return <Navigate to="/nueva-contrasena" replace />
  if (sesion) return <Navigate to="/" replace />

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    m.mutate()
  }

  return (
    <Marco titulo="Iniciar sesión">
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <Campo etiqueta="Correo" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} requerido />
        <Campo etiqueta="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} requerido />
        {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
        <Boton type="submit" cargando={m.isPending} disabled={!email || !password}>
          Entrar
        </Boton>
        <Link to="/recuperar" className="text-center text-sm font-semibold text-accent underline-offset-4 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </Marco>
  )
}

export function RecuperarPage() {
  const [email, setEmail] = useState('')
  const m = useMutation({ mutationFn: () => solicitarRecuperacion(email) })
  return (
    <Marco titulo="Recuperar contraseña">
      {m.isSuccess ? (
        <Aviso tono="exito" titulo="Revisa tu correo">
          Si la cuenta existe, te enviamos un enlace para definir una nueva contraseña.
        </Aviso>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            m.mutate()
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          <p className="text-sm text-ink-2">Escribe el correo de tu cuenta individual y te enviaremos un enlace.</p>
          <Campo etiqueta="Correo" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} requerido />
          {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
          <Boton type="submit" cargando={m.isPending} disabled={!email}>
            Enviar enlace
          </Boton>
        </form>
      )}
      <Link to="/login" className="mt-4 block text-center text-sm font-semibold text-accent underline-offset-4 hover:underline">
        Volver a iniciar sesión
      </Link>
    </Marco>
  )
}

export function NuevaContrasenaPage() {
  const { sesion, cargando } = useSesion()
  const nav = useNavigate()
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const m = useMutation({ mutationFn: () => cambiarContrasena(p1), onSuccess: () => nav('/', { replace: true }) })
  const corta = p1.length > 0 && p1.length < 10
  const distinta = p2.length > 0 && p1 !== p2

  if (!cargando && !sesion) {
    return (
      <Marco titulo="Enlace no válido">
        <Aviso tono="alerta">El enlace expiró o ya se usó. Solicita uno nuevo.</Aviso>
        <Link to="/recuperar" className="mt-4 block text-center text-sm font-semibold text-accent">
          Solicitar otro enlace
        </Link>
      </Marco>
    )
  }

  return (
    <Marco titulo="Define tu contraseña">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!corta && !distinta) m.mutate()
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <Campo
          etiqueta="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          ayuda="Mínimo 10 caracteres. Es personal: no la compartas."
          error={corta ? 'Debe tener al menos 10 caracteres.' : null}
          requerido
        />
        <Campo
          etiqueta="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          error={distinta ? 'Las contraseñas no coinciden.' : null}
          requerido
        />
        {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
        <Boton type="submit" cargando={m.isPending} disabled={!p1 || !p2 || corta || distinta}>
          Guardar y entrar
        </Boton>
      </form>
    </Marco>
  )
}
