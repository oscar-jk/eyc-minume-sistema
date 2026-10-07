import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTema } from '@/app/tema'
import { CieloEstrellado } from '@/components/CieloEstrellado'
import { Anillo, Bloques, Circulos, Damero, Destello, Estrella8, Flor } from '@/components/Elementos'
import { IcoLuna, IcoSol } from '@/components/Iconos'
import { Marca } from '@/components/Marca'

/* ───────────── Piezas editoriales del manual (identidad MXVII) ───────────── */

type Rol = 'conceptos' | 'eyc' | 'subse' | 'sg' | 'admin'

const ROLES: { id: Rol; corto: string; titulo: ReactNode; quien: string; adorno: ReactNode }[] = [
  {
    id: 'conceptos',
    corto: 'Conceptos',
    titulo: (
      <>
        Antes <span className="acento">de</span> empezar
      </>
    ),
    quien: 'Para todos los roles',
    adorno: <Estrella8 tono="celeste" className="w-full" />,
  },
  {
    id: 'eyc',
    corto: 'Evaluación y Control',
    titulo: (
      <>
        Equipo <span className="acento">de</span> EyC
      </>
    ),
    quien: 'Un equipo por comisión · evalúa a la mesa directiva',
    adorno: <Bloques tono="celeste" className="w-full" />,
  },
  {
    id: 'subse',
    corto: 'Subsecretaría',
    titulo: (
      <>
        Subsecretaría <span className="acento">de</span> Planificación
      </>
    ),
    quien: 'Monitorea, configura, recomienda y evalúa al EyC',
    adorno: <Circulos tono="celeste" className="w-full" />,
  },
  {
    id: 'sg',
    corto: 'Secretaría General',
    titulo: (
      <>
        Secretaría <span className="acento">General</span>
      </>
    ),
    quien: 'Decide la continuidad en los casos elevados',
    adorno: <Flor tono="rosa" className="w-full" />,
  },
  {
    id: 'admin',
    corto: 'Administración',
    titulo: (
      <>
        Administración <span className="acento">del</span> sistema
      </>
    ),
    quien: 'Cuentas, roles, catálogos y todo lo de Subsecretaría',
    adorno: <Damero tono="celeste" className="w-full" />,
  },
]

function Capitulo({ id, n, rol, children }: { id: Rol; n: number; rol: (typeof ROLES)[number]; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 print:break-before-page">
      <header className="relative isolate mb-8 overflow-hidden rounded-[32px] rounded-tr-[8px] bg-grad-heroe px-6 py-8 text-white shadow-card sm:px-10 sm:py-12 print:break-after-avoid print:py-8 print:shadow-none">
        <CieloEstrellado densidad={1.4} className="-z-10 print:hidden" />
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-8 w-52 rotate-6 opacity-35 mix-blend-screen [mask-image:radial-gradient(closest-side,#000_35%,transparent_100%)] [-webkit-mask-image:radial-gradient(closest-side,#000_35%,transparent_100%)] sm:w-72">
          {rol.adorno}
        </div>
        <p className="sobretitulo relative flex items-center gap-3 text-cian">
          <span className="font-cond text-5xl font-extrabold leading-none text-white/25 tabular">{String(n).padStart(2, '0')}</span>
          Capítulo
        </p>
        <h2 className="relative mt-2 text-[clamp(2rem,6vw,3.4rem)] font-black leading-[1.02] tracking-tight">{rol.titulo}</h2>
        <p className="relative mt-3 max-w-xl text-white/85">{rol.quien}</p>
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  )
}

function Seccion({ titulo, children, donde }: { titulo: ReactNode; children: ReactNode; donde?: string }) {
  return (
    <article className="relative overflow-hidden rounded-[28px] rounded-tr-[6px] border border-line bg-surface p-5 shadow-card sm:p-7 dark:bg-vidrio print:overflow-visible print:shadow-none">
      <span aria-hidden className="pointer-events-none absolute left-6 right-16 top-0 h-[3px] rounded-b-full bg-grad-primario dark:bg-grad-celeste" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span aria-hidden className="grid size-8 place-items-center rounded-lg rounded-tr-sm bg-grad-primario shadow-boton">
          <Destello className="size-4 text-white" />
        </span>
        <h3 className="text-xl font-black tracking-tight sm:text-2xl">{titulo}</h3>
        {donde && <span className="ml-auto rounded-full bg-accent-soft px-3 py-1 font-cond text-sm font-bold text-acento">📍 {donde}</span>}
      </div>
      <div className="flex flex-col gap-4 text-[1.02rem] leading-relaxed text-ink-2 [&_strong]:text-ink">{children}</div>
    </article>
  )
}

/** Pasos numerados con línea de tiempo vertical. */
function Pasos({ items }: { items: ReactNode[] }) {
  return (
    <ol className="relative flex flex-col gap-4 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-[2px] before:bg-gradient-to-b before:from-[#0090fb] before:to-[#00f0e6]">
      {items.map((it, i) => (
        <li key={i} className="relative flex gap-4">
          <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-xl rounded-tr-sm bg-grad-primario font-cond text-lg font-extrabold text-white shadow-boton">{i + 1}</span>
          <div className="pt-1.5">{it}</div>
        </li>
      ))}
    </ol>
  )
}

function Nota({ tipo = 'tip', children }: { tipo?: 'tip' | 'ojo' | 'regla'; children: ReactNode }) {
  const t = {
    tip: { et: 'Consejo', caja: 'bg-accent-soft ring-accent/20', chip: 'bg-grad-primario', txt: 'text-acento' },
    ojo: { et: 'Atención', caja: 'bg-amarillo-bg ring-amarillo/25', chip: 'bg-gradient-to-br from-[#f5a300] to-[#ffd84d]', txt: 'text-amarillo' },
    regla: { et: 'Regla del sistema', caja: 'bg-rojo-bg ring-rojo/25', chip: 'bg-grad-rosa', txt: 'text-rojo' },
  }[tipo]
  return (
    <div className={`flex gap-3 rounded-2xl rounded-tl-[6px] p-4 ring-1 print:break-inside-avoid ${t.caja}`}>
      <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-xl rounded-tl-sm text-white ${t.chip}`}>
        <Estrella8 className="size-4" />
      </span>
      <div>
        <p className={`font-cond text-[0.72rem] font-bold uppercase tracking-[0.14em] ${t.txt}`}>{t.et}</p>
        <div className="text-ink">{children}</div>
      </div>
    </div>
  )
}

/** Botón dibujado como en la interfaz, para señalar qué tocar. */
function B({ children, tono = 'primario' }: { children: ReactNode; tono?: 'primario' | 'secundario' | 'peligro' }) {
  const c = { primario: 'bg-grad-primario text-white', secundario: 'bg-accent-soft text-acento', peligro: 'bg-grad-rosa text-white' }[tono]
  return <span className={`mx-0.5 inline-flex items-center rounded-lg px-2 py-0.5 text-[0.9em] font-bold ${c}`}>{children}</span>
}

function Ruta({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap rounded-md bg-surface-2 px-1.5 py-0.5 font-cond font-bold text-ink">{children}</span>
}

function Semaforos() {
  const items = [
    ['Cumple', '≥ 80', 'Desempeño sólido o superior', 'from-[#14a34a] to-[#6ee7a0]', 'bg-verde-bg text-verde'],
    ['Seguimiento', '60 – 79', 'Cumple lo esencial; requiere acompañamiento', 'from-[#f5a300] to-[#ffd84d]', 'bg-amarillo-bg text-amarillo'],
    ['En riesgo', '< 60', 'No alcanza el estándar mínimo', 'from-[#e53535] to-[#ff7aa8]', 'bg-rojo-bg text-rojo'],
    ['No evaluado', 'sin datos', 'Sin evaluaciones completas en ese corte (nunca es 0)', 'from-[#6b7c99] to-[#b6c5de]', 'bg-gris-bg text-gris'],
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([n, r, d, g, c]) => (
        <div key={n} className={`relative overflow-hidden rounded-2xl p-4 pt-5 ${c}`}>
          <span aria-hidden className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${g}`} />
          <p className="font-cond text-3xl font-extrabold leading-none">{r}</p>
          <p className="mt-1 font-extrabold">{n}</p>
          <p className="text-sm text-ink-2">{d}</p>
        </div>
      ))}
    </div>
  )
}

function Cortes() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        ['25 %', 'Corte 1', 'Preparación: incorporación, capacitaciones y actividades previas.'],
        ['25 %', 'Corte 2', 'Seguimiento: desempeño de los días 1 y 2 del evento.'],
        ['50 %', 'Evaluación Final', 'Desempeño de los días 3 al 6 del evento.'],
      ].map(([p, t, d]) => (
        <div key={t} className="rounded-2xl rounded-tr-[6px] border border-line bg-surface-2 p-4 dark:bg-white/[0.05]">
          <p className="texto-grad font-cond text-4xl font-extrabold leading-none">{p}</p>
          <p className="mt-1 font-extrabold text-ink">{t}</p>
          <p className="text-sm">{d}</p>
        </div>
      ))}
    </div>
  )
}

/* ───────────── Contenido ───────────── */

export function ManualPage() {
  const { tema, siguiente } = useTema()
  const [activo, setActivo] = useState<Rol>('conceptos')

  useEffect(() => {
    let previo: string | undefined
    const antes = () => {
      previo = document.documentElement.dataset.theme
      document.documentElement.dataset.theme = 'light'
    }
    const despues = () => {
      if (previo) document.documentElement.dataset.theme = previo
    }
    window.addEventListener('beforeprint', antes)
    window.addEventListener('afterprint', despues)
    return () => {
      window.removeEventListener('beforeprint', antes)
      window.removeEventListener('afterprint', despues)
    }
  }, [])

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActivo(e.target.id as Rol)),
      { rootMargin: '-30% 0px -60% 0px' },
    )
    ROLES.forEach((r) => {
      const el = document.getElementById(r.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  return (
    <div className="min-h-dvh">
      {/* Portada */}
      <header className="relative isolate overflow-hidden bg-grad-noche px-5 pb-20 pt-8 text-white sm:px-10 print:h-[255mm]">
        <CieloEstrellado densidad={1.2} className="print:hidden" />
        <Anillo className="pointer-events-none absolute -bottom-48 -right-40 -z-0 w-[40rem] text-celeste/50 [animation:girar_240s_linear_infinite] sm:w-[56rem]" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="flex items-center gap-3 font-black">
            2026 <Destello className="size-5 text-cian" />
            <Marca tipo="estrellas" blanco className="h-9 w-auto" />
          </p>
          <div className="flex items-center gap-2 print:hidden">
            <button type="button" onClick={siguiente} aria-label="Cambiar tema" className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 hover:bg-white/20">
              {tema === 'dark' ? <IcoSol className="size-5" /> : <IcoLuna className="size-5" />}
            </button>
            <button type="button" onClick={() => window.print()} className="min-h-11 rounded-xl bg-white px-4 font-bold text-[#0043c5]">
              Imprimir / PDF
            </button>
          </div>
        </div>
        <div className="relative mx-auto mt-16 max-w-6xl sm:mt-24">
          <p className="sobretitulo text-cian">Manual de usuario · Versión 2.0</p>
          <h1 className="mt-3 text-[clamp(2.6rem,9vw,6rem)] font-black leading-[0.95] tracking-tight">
            Evaluación
            <br />
            <span className="acento font-normal">y</span> Control
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Marca tipo="lockup" blanco className="h-12 w-auto sm:h-16" />
            <span aria-hidden className="hidden h-12 w-px bg-white/30 sm:block" />
            <Marca tipo="footer" blanco className="h-12 w-auto sm:h-14" />
          </div>
          <p className="mt-6 max-w-xl text-lg text-white/85">
            Cómo usar el sistema según tu rol: el equipo de EyC de cada comisión, la Subsecretaría de Planificación y Desarrollo, la Secretaría General y la
            administración.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[230px_1fr] lg:px-10 print:block print:p-0">
        {/* Índice */}
        <nav aria-label="Índice del manual" className="min-w-0 print:hidden lg:sticky lg:top-6 lg:self-start">
          <p className="sobretitulo mb-3 text-acento">Índice</p>
          <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 sin-scrollbar lg:mx-0 lg:flex-col lg:px-0">
            {ROLES.map((r, i) => (
              <li key={r.id} className="shrink-0">
                <a
                  href={`#${r.id}`}
                  className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 font-bold transition ${
                    activo === r.id ? 'bg-grad-primario text-white shadow-boton' : 'bg-surface text-ink-2 hover:text-ink dark:bg-white/[0.05]'
                  }`}
                >
                  <span className="font-cond text-sm opacity-70 tabular">{String(i + 1).padStart(2, '0')}</span>
                  {r.corto}
                </a>
              </li>
            ))}
          </ol>
          <Link to="/" className="mt-4 hidden min-h-11 items-center justify-center rounded-2xl bg-accent-soft px-3 font-bold text-acento lg:flex">
            Ir al sistema →
          </Link>
        </nav>

        <main className="flex min-w-0 flex-col gap-16">
          {/* 01 · Conceptos */}
          <Capitulo id="conceptos" n={1} rol={ROLES[0]}>
            <Seccion titulo="Entrar al sistema" donde="Inicio de sesión">
              <p>
                Cada persona tiene su <strong>propia cuenta</strong>; nunca se comparte por comisión. La crea un administrador y tú defines tu contraseña con el enlace
                que recibes.
              </p>
              <Pasos
                items={[
                  <>
                    Abre el enlace que te enviaron (o entra a <Ruta>¿Olvidaste tu contraseña?</Ruta> y escribe tu correo).
                  </>,
                  <>Define una contraseña de al menos 10 caracteres. Es personal.</>,
                  <>
                    Entra con tu correo y contraseña. El sistema te lleva directo a tu pantalla según tu rol.
                  </>,
                ]}
              />
              <Nota>
                El botón <B tono="secundario">☾</B> cambia entre el tema claro y el oscuro. Tu preferencia se recuerda en ese dispositivo.
              </Nota>
            </Seccion>

            <Seccion titulo="Fases: cuándo se puede escribir">
              <p>
                El proceso avanza por fases. La fase abierta aparece siempre en la <strong>tarjeta de fase</strong> (barra lateral en computadora, arriba en el
                teléfono). Tócala para ver todas las fases y sus fechas.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Pendiente', 'Aún no empieza. No se puede escribir.', 'bg-gris-bg text-gris'],
                  ['Abierta', 'Se puede evaluar, recomendar y decidir según tu rol.', 'bg-verde-bg text-verde'],
                  ['Cerrada', 'Bloqueada para todos, incluido el administrador.', 'bg-rojo-bg text-rojo'],
                ].map(([t, d, c]) => (
                  <div key={t} className={`rounded-2xl p-4 ${c}`}>
                    <p className="font-extrabold">{t}</p>
                    <p className="text-sm text-ink-2">{d}</p>
                  </div>
                ))}
              </div>
              <p>
                Orden: <strong>Incorporación y preparación</strong> → <strong>Corte 1</strong> → <strong>Evento días 1 y 2</strong> → <strong>Corte 2</strong> →{' '}
                <strong>Evento días 3 al 6</strong> → <strong>Cierre y resultados</strong>.
              </p>
            </Seccion>

            <Seccion titulo="Cortes y puntaje final">
              <Cortes />
              <p>
                <strong>Puntaje final = Corte 1 × 25 % + Corte 2 × 25 % + Final × 50 %.</strong> Mientras falte cualquiera de los tres, el puntaje final aparece como{' '}
                <strong>«En espera»</strong>, nunca como un número bajo.
              </p>
              <Nota tipo="regla">El sistema calcula todo. Ninguna pantalla hace cuentas propias: dos personas siempre ven el mismo número.</Nota>
            </Seccion>

            <Seccion titulo="El semáforo">
              <p>Cada corte tiene su propio semáforo. Siempre muestra color, etiqueta, puntaje y cuántas evaluaciones hay detrás.</p>
              <Semaforos />
              <Nota>Una sola evaluación de 100 no pesa igual que diez. Fíjate siempre en el número entre paréntesis.</Nota>
            </Seccion>

            <Seccion titulo="La rúbrica: seis dimensiones">
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ['A', 'Cumplimiento y responsabilidad'],
                  ['B', 'Competencia académica y funcional'],
                  ['C', 'Trabajo colaborativo'],
                  ['D', 'Comunicación'],
                  ['E', 'Gestión humana y resolución'],
                  ['F', 'Ética, inclusión e innovación'],
                ].map(([k, n]) => (
                  <div key={k} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 dark:bg-white/[0.05]">
                    <span className="grid size-10 place-items-center rounded-xl rounded-tr-sm bg-grad-primario font-cond text-lg font-extrabold text-white">{k}</span>
                    <span className="font-bold text-ink">{n}</span>
                  </div>
                ))}
              </div>
              <p>
                Cada criterio se responde <B>Sí</B> <B>No</B> o <B tono="secundario">N/O</B> (no observado). Algunos criterios están redactados en negativo —por
                ejemplo «mostró desconocimiento del procedimiento»— y ahí lo esperado es <strong>«No»</strong>; el sistema lo indica debajo del criterio.
              </p>
              <Nota tipo="regla">
                <strong>N/O no es cero.</strong> Una dimensión no observada se excluye y el peso del resto se reparte. Una respuesta desfavorable exige comentario.
              </Nota>
            </Seccion>
          </Capitulo>

          {/* 02 · EyC */}
          <Capitulo id="eyc" n={2} rol={ROLES[1]}>
            <Seccion titulo="Tu pantalla: Mi comisión" donde="Mi comisión">
              <p>Tienes cuatro pestañas:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Evaluar', 'Antes del evento, por actividad. Durante el evento, «Hoy en tu comisión».'],
                  ['Mesa directiva', 'Quién está asignado ahora, su semáforo y el historial de cargos.'],
                  ['Actividades', 'Crear, editar, cerrar y reabrir talleres, capacitaciones y reuniones.'],
                  ['Histórico', 'Evaluaciones de cualquier persona que pasó por tu comisión.'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-2xl border border-line p-4">
                    <p className="font-extrabold text-ink">{t}</p>
                    <p className="text-sm">{d}</p>
                  </div>
                ))}
              </div>
            </Seccion>

            <Seccion titulo="Crear una actividad (antes del evento)" donde="Mi comisión › Actividades">
              <Pasos
                items={[
                  <>Escribe el nombre (por ejemplo «Segunda capacitación»), elige el tipo y la fecha.</>,
                  <>
                    Toca <B>Crear</B>. Aparece en la lista como <strong>Abierta</strong>.
                  </>,
                  <>
                    Si te equivocaste, toca <B tono="secundario">Editar</B>. Cuando ya evaluaste a todos, toca <B tono="secundario">Cerrar</B>.
                  </>,
                ]}
              />
              <Nota tipo="ojo">Solo puedes crear actividades mientras la fase de preparación esté abierta.</Nota>
            </Seccion>

            <Seccion titulo="Evaluar a una persona" donde="Mi comisión › Evaluar">
              <Pasos
                items={[
                  <>
                    Antes del evento, toca la <strong>píldora de la actividad</strong> (la más reciente ya viene elegida). Durante el evento verás directamente «Hoy en
                    tu comisión».
                  </>,
                  <>
                    Toca <B>Evaluar</B> junto a la persona.
                  </>,
                  <>
                    Abre cada dimensión (A a F) y responde cada criterio con <B>Sí</B> <B>No</B> o <B tono="secundario">N/O</B>. Si no pudiste observar una dimensión
                    completa, marca <strong>«Dimensión no observada»</strong>.
                  </>,
                  <>
                    Si una respuesta es desfavorable (se pinta en <span className="font-bold text-rojo">rojo</span>), escribe el comentario obligatorio.
                  </>,
                  <>
                    Toca <B tono="secundario">Guardar borrador</B> si vas a seguir luego, o <B>Marcar completa</B> al terminar.
                  </>,
                ]}
              />
              <Nota>
                La barra inferior muestra el progreso. Si falta algo, el sistema lo lista con enlaces directos al criterio pendiente; nada se pierde porque primero se
                guarda como borrador.
              </Nota>
              <Nota tipo="regla">Solo cuentan para el promedio las evaluaciones completas. Los borradores aparecen aparte.</Nota>
            </Seccion>

            <Seccion titulo="Durante el evento: rotaciones" donde="Mi comisión › Evaluar">
              <p>
                Las mesas rotan entre comisiones. Tú evalúas a quien estuvo en <strong>tu comisión ese día</strong>. Si alguien rotó a media jornada, se evalúa
                donde estuvo más tiempo; el sistema lo indica con «rotó: su jornada se evalúa en la otra comisión».
              </p>
              <p>Puedes elegir jornadas pasadas en las píldoras de días para completar evaluaciones pendientes.</p>
            </Seccion>

            <Seccion titulo="Recomendar en los cortes" donde="Mi comisión › Mesa directiva">
              <Pasos
                items={[
                  <>Cuando la fase de corte esté abierta, aparece el botón <B tono="secundario">Recomendar</B> junto a cada persona.</>,
                  <>
                    Elige <strong>Continúa</strong>, <strong>Seguimiento</strong>, <strong>Sustitución</strong> o <strong>No evaluado</strong>.
                  </>,
                  <>El comentario es obligatorio con semáforo amarillo o rojo y en toda sustitución.</>,
                ]}
              />
              <Nota tipo="ojo">Los casos en rojo o de sustitución se elevan automáticamente a la Secretaría General.</Nota>
            </Seccion>
          </Capitulo>

          {/* 03 · Subsecretaría */}
          <Capitulo id="subse" n={3} rol={ROLES[2]}>
            <Seccion titulo="Monitoreo del desempeño" donde="Monitoreo › Semáforo">
              <p>
                Arriba eliges el <strong>corte</strong>. Las cuatro tarjetas de color cuentan cuántas personas hay en cada semáforo:{' '}
                <strong>tócalas para filtrar</strong>. En el teléfono, los demás filtros están en «Más filtros».
              </p>
              <p>Cada fila muestra semáforo, borradores, estatus de continuidad y recomendación. Toca el nombre para abrir la ficha completa.</p>
            </Seccion>

            <Seccion titulo="Cobertura: ¿quién va al día?" donde="Monitoreo › Cobertura">
              <p>
                Por comisión y fase: evaluaciones <strong>completas</strong>, <strong>borradores</strong> y <strong>esperadas</strong>. Antes del evento se espera una por
                actividad y persona; durante el evento, una por jornada y persona.
              </p>
            </Seccion>

            <Seccion titulo="Personas y asignaciones" donde="Personas">
              <Pasos
                items={[
                  <>
                    <strong>Carga masiva:</strong> pega una línea por persona: <Ruta>Nombre; comisión; cargo; correo</Ruta>. Revisa la vista previa y registra
                    (todo o nada).
                  </>,
                  <>
                    <strong>Alta individual:</strong> para una sola persona.
                  </>,
                  <>
                    <strong>Mover</strong> (en Asignaciones): rotación, ajuste o asignación inicial. Si el cargo destino está ocupado, elige <strong>Intercambiar</strong>.
                  </>,
                  <>
                    <strong>Editar</strong>: cambia nombre, correo o notas. El historial no se pierde nunca.
                  </>,
                ]}
              />
              <Nota>Cargos válidos: director, adjunto1, adjunto2, aprendiz, eyc. Comisión por clave o sigla (ctd, PNUD…).</Nota>
            </Seccion>

            <Seccion titulo="Recomendaciones y decisiones" donde="Monitoreo · Decisiones">
              <p>
                Registras recomendaciones desde Monitoreo. En <Ruta>Decisiones</Ruta> cierras los casos de <strong>Continúa</strong> y <strong>Seguimiento</strong>;
                los de rojo o sustitución los ve pero los decide la Secretaría General.
              </p>
              <p>
                Tras una decisión de sustitución puedes registrar a la persona entrante desde su ficha con <B tono="peligro">Registrar sustitución</B>.
              </p>
            </Seccion>

            <Seccion titulo="Evaluar al equipo de EyC" donde="Monitoreo › Evaluar EyC">
              <p>Funciona igual que la evaluación de la mesa: por actividad antes del evento (crea actividades de EyC ahí mismo) y por jornada durante el evento.</p>
            </Seccion>

            <Seccion titulo="Configuración" donde="Configuración">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Fases y evento', 'Abrir y cerrar fases, fechas, día 1 del evento y método de promedio.'],
                  ['Pesos A–F', 'Por ámbito; deben sumar 100. Márcalos como definitivos cuando se aprueben.'],
                  ['Cortes y umbrales', 'Peso de cada corte y bandas del semáforo.'],
                  ['Criterios', 'Texto y respuesta esperada; cada cambio guarda versión.'],
                  ['Comisiones y catálogos', 'Nombres y competencias de las dimensiones.'],
                  ['Auditoría', 'Quién cambió qué y cuándo, con valores anteriores.'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-2xl border border-line p-4">
                    <p className="font-extrabold text-ink">{t}</p>
                    <p className="text-sm">{d}</p>
                  </div>
                ))}
              </div>
              <Nota tipo="regla">Cerrar una fase bloquea toda escritura de ese período. Para corregir algo, reábrela, corrige y vuelve a cerrarla.</Nota>
            </Seccion>
          </Capitulo>

          {/* 04 · Secretaría General */}
          <Capitulo id="sg" n={4} rol={ROLES[3]}>
            <Seccion titulo="Tu bandeja de decisiones" donde="Decisiones">
              <p>
                Por defecto ves <strong>los casos que te toca decidir</strong>: semáforo rojo o recomendación de sustitución. Los elevados pendientes tienen borde
                rojo.
              </p>
              <Pasos
                items={[
                  <>
                    Toca <B tono="secundario">Ver historial completo</B> para revisar los tres cortes, el estatus y el puntaje final antes de decidir.
                  </>,
                  <>
                    Toca <B>Decidir</B> y elige <strong>Continúa</strong>, <strong>Seguimiento</strong> o <strong>Sustitución</strong>.
                  </>,
                  <>Escribe el comentario (obligatorio en casos elevados). Queda guardado con tu nombre y la fecha.</>,
                  <>Si decides sustitución, puedes registrar en el mismo paso a la persona que entra al cargo.</>,
                ]}
              />
              <Nota tipo="regla">Una decisión no se puede editar. El estatus de continuidad de la persona pasa a ser tu última decisión.</Nota>
            </Seccion>
            <Seccion titulo="Consultar" donde="Monitoreo · Comisiones">
              <p>Puedes ver el monitoreo, la cobertura, cada comisión y cada ficha, pero no editar evaluaciones ni configuración.</p>
            </Seccion>
          </Capitulo>

          {/* 05 · Administración */}
          <Capitulo id="admin" n={5} rol={ROLES[4]}>
            <Seccion titulo="Crear cuentas" donde="Configuración › Cuentas">
              <Pasos
                items={[
                  <>Escribe nombre y correo, elige el rol (y la comisión si es EyC).</>,
                  <>
                    Toca <B>Crear</B>: aparece un <strong>enlace de acceso</strong>. Cópialo y envíalo solo a esa persona.
                  </>,
                  <>
                    Si se pierde o caduca, usa <B tono="secundario">Enlace</B> en su fila. <B tono="secundario">Bloquear</B> le quita el acceso sin borrar su historial.
                  </>,
                ]}
              />
              <Nota tipo="regla">Nunca se crean cuentas compartidas. Quien se registra por su cuenta queda sin rol y sin acceso.</Nota>
            </Seccion>
            <Seccion titulo="Editar comisiones y cargos" donde="Configuración › Comisiones y catálogos">
              <p>
                Cambia el <strong>nombre</strong> y la <strong>sigla</strong> de una comisión (también desde su página con <B tono="secundario">Editar comisión</B>),
                márcala inactiva o renombra los cargos. La clave interna no cambia para no romper la carga masiva.
              </p>
            </Seccion>
            <Seccion titulo="Todo lo de Subsecretaría">
              <p>El administrador tiene además todas las funciones del capítulo 3 y puede decidir cualquier caso.</p>
              <Nota tipo="ojo">Ni el administrador puede escribir en una fase cerrada: es una garantía de integridad, no un error.</Nota>
            </Seccion>
          </Capitulo>

          <footer className="relative isolate overflow-hidden rounded-[32px] rounded-tr-[8px] bg-grad-noche p-8 text-center text-white">
            <CieloEstrellado densidad={1.2} className="-z-10 print:hidden" />
            <Marca tipo="estrellas" blanco className="mx-auto h-12 w-auto" />
            <p className="mt-4 text-white/80">Sistema de Evaluación y Control · Modelo Internacional de las Naciones Unidas del Ministerio de Educación</p>
            <Link to="/" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-5 font-bold text-[#0043c5] print:hidden">
              Ir al sistema
            </Link>
          </footer>
        </main>
      </div>
    </div>
  )
}
