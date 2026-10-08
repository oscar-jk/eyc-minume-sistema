import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Boton } from '@/components/Boton'
import { Campo } from '@/components/Campo'
import { CieloEstrellado } from '@/components/CieloEstrellado'
import { Destello, Estrella8 } from '@/components/Elementos'
import { Marca } from '@/components/Marca'
import { Acento, Aviso } from '@/components/Ui'
import { mensajeError } from '@/lib/errores'
import { cambiarContrasena, entrar, solicitarRecuperacion } from './api'
import { useSesion } from './AuthProvider'

/** Pantallas de acceso: cielo nocturno con estrellas reales y la identidad «MINUME de Estrellas». */
function Marco({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <main className="relative grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      {/* Arte: cielo estrellado (arriba en móvil, izquierda en PC) */}
      <section className="relative isolate overflow-hidden bg-grad-noche px-6 pb-24 pt-12 text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <CieloEstrellado />
        <div aria-hidden className="pointer-events-none absolute -left-24 top-1/3 size-80 rounded-full bg-[#0090fb]/30 blur-[100px]" />
        <p className="relative flex items-center justify-center gap-3 font-black tracking-tight lg:justify-start">
          <span className="text-lg">2026</span>
          <Destello className="size-5 text-cian" />
          <Marca tipo="estrellas" blanco className="h-9 w-auto" />
        </p>
        <div className="relative mt-10 flex flex-col items-center text-center lg:mt-0 lg:items-start lg:text-left">
          {/* Como la cabecera del correo: el anillo gira centrado sobre los logos y su hueco los enmarca.
              El contenedor centra (translate) y la imagen gira (rotate): transformaciones separadas. */}
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-[calc(50%-2.25rem)] -z-10 aspect-square w-[260%] -translate-x-1/2 -translate-y-1/2 lg:top-1/2 lg:w-[250%]">
              <div className="absolute inset-[22%] rounded-full bg-[radial-gradient(closest-side,rgb(0_144_251/0.4),transparent)]" />
              <img src="/brand/anillo.svg" alt="" className="size-full max-w-none opacity-[0.34] mix-blend-screen lg:opacity-[0.22] [animation:girar_240s_linear_infinite]" />
            </div>
            <Marca tipo="lockup" blanco className="h-auto w-64 sm:w-80 lg:w-[30rem]" />
          </div>
          <p className="mt-6 hidden max-w-md text-lg text-white/80 lg:block">
            Sistema de <span className="font-bold text-white">Evaluación y Control</span> del desempeño de las mesas directivas y del equipo de EyC.
          </p>
        </div>
        <p className="relative mt-8 hidden text-sm text-white/60 lg:block">
          Modelo Internacional de las Naciones Unidas del Ministerio de Educación ·{' '}
          <Link to="/manual" className="font-bold text-cian underline-offset-4 hover:underline">
            Manual de usuario
          </Link>
        </p>
      </section>

      {/* Formulario */}
      <section className="relative -mt-10 flex flex-col items-center justify-start px-4 pb-12 lg:mt-0 lg:justify-center lg:bg-bg lg:px-10">
        <div className="animar-entrada w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8 dark:bg-vidrio dark:backdrop-blur-xl">
          <p className="sobretitulo flex items-center gap-2 text-acento">
            <Estrella8 tono="azul" className="size-3.5" /> Evaluación y Control
          </p>
          <h1 className="mb-6 mt-2 text-[2rem] font-black leading-tight tracking-tight">{titulo}</h1>
          {children}
        </div>
        {/* Créditos institucionales: tono formal, serif y filetes finos */}
        <div className="mt-10 flex w-full max-w-md flex-col items-center gap-3 text-center lg:absolute lg:bottom-8 lg:left-1/2 lg:mt-0 lg:-translate-x-1/2">
          <p className="flex w-full items-center gap-3 font-serif text-[0.8rem] italic text-ink-3">
            <span aria-hidden className="h-px flex-1 bg-line-strong/40" />
            Una iniciativa del
            <span aria-hidden className="h-px flex-1 bg-line-strong/40" />
          </p>
          <Marca tipo="footer" className="h-14 w-auto" />
          <p className="font-serif text-[0.72rem] leading-snug text-ink-3">
            Ministerio de Educación de la República Dominicana · PLERD
          </p>
        </div>
      </section>
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
    <Marco titulo={<>Bienvenido <Acento>de</Acento> vuelta</>}>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <Campo etiqueta="Correo" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} requerido />
        <Campo etiqueta="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} requerido />
        {m.isError && <Aviso tono="peligro">{mensajeError(m.error)}</Aviso>}
        <Boton type="submit" className="mt-1 min-h-12 w-full text-base" cargando={m.isPending} disabled={!email || !password}>
          Entrar
        </Boton>
        <Link to="/recuperar" className="text-center text-sm font-bold text-acento underline-offset-4 hover:underline">
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
    <Marco titulo={<>Recupera <Acento>tu</Acento> acceso</>}>
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
          <Boton type="submit" className="mt-1 min-h-12 w-full text-base" cargando={m.isPending} disabled={!email}>
            Enviar enlace
          </Boton>
        </form>
      )}
      <Link to="/login" className="mt-4 block text-center text-sm font-bold text-acento underline-offset-4 hover:underline">
        Volver a iniciar sesión
      </Link>
    </Marco>
  )
}

export function NuevaContrasenaPage() {
  const { sesion, cargando, terminarRecuperacion } = useSesion()
  const nav = useNavigate()
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const m = useMutation({ mutationFn: () => cambiarContrasena(p1), onSuccess: () => {
      terminarRecuperacion()
      nav('/', { replace: true })
    } })
  const corta = p1.length > 0 && p1.length < 10
  const distinta = p2.length > 0 && p1 !== p2

  if (!cargando && !sesion) {
    return (
      <Marco titulo="Enlace no válido">
        <Aviso tono="alerta" titulo="Este enlace ya no sirve" accion={{ texto: 'Pedir un enlace nuevo', a: '/recuperar' }}>
          Los enlaces son de un solo uso y caducan en una hora.
        </Aviso>
        <Link to="/recuperar" className="mt-4 block text-center text-sm font-bold text-acento">
          Solicitar otro enlace
        </Link>
      </Marco>
    )
  }

  return (
    <Marco titulo={<>Define <Acento>tu</Acento> contraseña</>}>
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
        <Boton type="submit" className="mt-1 min-h-12 w-full text-base" cargando={m.isPending} disabled={!p1 || !p2 || corta || distinta}>
          Guardar y entrar
        </Boton>
      </form>
    </Marco>
  )
}
