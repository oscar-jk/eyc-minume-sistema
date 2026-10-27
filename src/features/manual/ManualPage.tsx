import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTema } from "@/app/tema";
import { CieloEstrellado } from "@/components/CieloEstrellado";
import {
  Bloques,
  Circulos,
  Damero,
  Destello,
  Estrella8,
  Flor,
} from "@/components/Elementos";
import { IcoLuna, IcoSol } from "@/components/Iconos";
import { Marca } from "@/components/Marca";

/* ───────────── Piezas editoriales del manual (identidad MXVII) ───────────── */

type Rol = "conceptos" | "eyc" | "subse" | "sg" | "admin" | "faq";

const ROLES: {
  id: Rol;
  corto: string;
  titulo: ReactNode;
  quien: string;
  adorno: ReactNode;
}[] = [
  {
    id: "conceptos",
    corto: "Conceptos",
    titulo: (
      <>
        Antes <span className="acento">de</span> empezar
      </>
    ),
    quien: "Para todos los roles",
    adorno: <Estrella8 tono="celeste" className="w-full" />,
  },
  {
    id: "eyc",
    corto: "Evaluación y Control",
    titulo: (
      <>
        Equipo <span className="acento">de</span> EyC
      </>
    ),
    quien: "Un equipo por comisión · evalúa a la mesa directiva",
    adorno: <Bloques tono="celeste" className="w-full" />,
  },
  {
    id: "subse",
    corto: "Subsecretaría",
    titulo: (
      <>
        Subse <span className="acento">de</span> EyC
      </>
    ),
    quien: "Monitorea, configura, recomienda y evalúa al EyC",
    adorno: <Circulos tono="celeste" className="w-full" />,
  },
  {
    id: "sg",
    corto: "Secretaría General",
    titulo: (
      <>
        Secretaría <span className="acento">General</span>
      </>
    ),
    quien: "Decide la continuidad en los casos elevados",
    adorno: <Flor tono="rosa" className="w-full" />,
  },
  {
    id: "admin",
    corto: "Administración",
    titulo: (
      <>
        Administración <span className="acento">del</span> sistema
      </>
    ),
    quien: "Cuentas, roles, catálogos y todo lo de Subsecretaría",
    adorno: <Damero tono="celeste" className="w-full" />,
  },
  {
    id: "faq",
    corto: "Preguntas frecuentes",
    titulo: (
      <>
        Preguntas <span className="acento">frecuentes</span>
      </>
    ),
    quien: "Problemas comunes y su solución",
    adorno: <Flor tono="rosa" className="w-full" />,
  },
];

function Capitulo({
  id,
  n,
  rol,
  children,
}: {
  id: Rol;
  n: number;
  rol: (typeof ROLES)[number];
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 print:break-before-page">
      <header className="relative isolate mb-8 overflow-hidden rounded-[32px] rounded-tr-[8px] bg-grad-heroe px-6 py-8 text-white shadow-card sm:px-10 sm:py-12 print:break-after-avoid print:py-8 print:shadow-none">
        <CieloEstrellado densidad={1.4} className="-z-10 print:hidden" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-8 w-52 rotate-6 opacity-35 mix-blend-screen [mask-image:radial-gradient(closest-side,#000_35%,transparent_100%)] [-webkit-mask-image:radial-gradient(closest-side,#000_35%,transparent_100%)] sm:w-72"
        >
          {rol.adorno}
        </div>
        <p className="sobretitulo relative flex items-center gap-3 text-cian">
          <span className="font-cond text-5xl font-extrabold leading-none text-white/25 tabular">
            {String(n).padStart(2, "0")}
          </span>
          Capítulo
        </p>
        <h2 className="relative mt-2 text-[clamp(2rem,6vw,3.4rem)] font-black leading-[1.02] tracking-tight">
          {rol.titulo}
        </h2>
        <p className="relative mt-3 max-w-xl text-white/85">{rol.quien}</p>
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

function Seccion({
  titulo,
  children,
  donde,
}: {
  titulo: ReactNode;
  children: ReactNode;
  donde?: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-[28px] rounded-tr-[6px] border border-line bg-surface p-5 shadow-card sm:p-7 dark:bg-vidrio print:overflow-visible print:shadow-none">
      <span
        aria-hidden
        className="pointer-events-none absolute left-6 right-16 top-0 h-[3px] rounded-b-full bg-grad-primario dark:bg-grad-celeste"
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-lg rounded-tr-sm bg-grad-primario shadow-boton"
        >
          <Destello className="size-4 text-white" />
        </span>
        <h3 className="text-xl font-black tracking-tight sm:text-2xl">
          {titulo}
        </h3>
        {donde && (
          <span className="ml-auto rounded-full bg-accent-soft px-3 py-1 font-cond text-sm font-bold text-acento">
            📍 {donde}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-4 text-[1.02rem] leading-relaxed text-ink-2 [&_strong]:text-ink">
        {children}
      </div>
    </article>
  );
}

/** Pasos numerados con línea de tiempo vertical. */
function Pasos({ items }: { items: ReactNode[] }) {
  return (
    <ol className="relative flex flex-col gap-4 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-[2px] before:bg-gradient-to-b before:from-[#0090fb] before:to-[#00f0e6]">
      {items.map((it, i) => (
        <li key={i} className="relative flex gap-4">
          <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-xl rounded-tr-sm bg-grad-primario font-cond text-lg font-extrabold text-white shadow-boton">
            {i + 1}
          </span>
          <div className="pt-1.5">{it}</div>
        </li>
      ))}
    </ol>
  );
}

function Nota({
  tipo = "tip",
  children,
}: {
  tipo?: "tip" | "ojo" | "regla";
  children: ReactNode;
}) {
  const t = {
    tip: {
      et: "Consejo",
      caja: "bg-accent-soft ring-accent/20",
      chip: "bg-grad-primario",
      txt: "text-acento",
    },
    ojo: {
      et: "Atención",
      caja: "bg-amarillo-bg ring-amarillo/25",
      chip: "bg-gradient-to-br from-[#f5a300] to-[#ffd84d]",
      txt: "text-amarillo",
    },
    regla: {
      et: "Regla del sistema",
      caja: "bg-rojo-bg ring-rojo/25",
      chip: "bg-grad-rosa",
      txt: "text-rojo",
    },
  }[tipo];
  return (
    <div
      className={`flex gap-3 rounded-2xl rounded-tl-[6px] p-4 ring-1 print:break-inside-avoid ${t.caja}`}
    >
      <span
        aria-hidden
        className={`grid size-9 shrink-0 place-items-center rounded-xl rounded-tl-sm text-white ${t.chip}`}
      >
        <Estrella8 className="size-4" />
      </span>
      <div>
        <p
          className={`font-cond text-[0.72rem] font-bold uppercase tracking-[0.14em] ${t.txt}`}
        >
          {t.et}
        </p>
        <div className="text-ink">{children}</div>
      </div>
    </div>
  );
}

/** Botón dibujado como en la interfaz, para señalar qué tocar. */
function B({
  children,
  tono = "primario",
}: {
  children: ReactNode;
  tono?: "primario" | "secundario" | "peligro";
}) {
  const c = {
    primario: "bg-grad-primario text-white",
    secundario: "bg-accent-soft text-acento",
    peligro: "bg-grad-rosa text-white",
  }[tono];
  return (
    <span
      className={`mx-0.5 inline-flex items-center rounded-lg px-2 py-0.5 text-[0.9em] font-bold ${c}`}
    >
      {children}
    </span>
  );
}

function Ruta({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-md bg-surface-2 px-1.5 py-0.5 font-cond font-bold text-ink">
      {children}
    </span>
  );
}

function Semaforos() {
  const items = [
    [
      "Cumple",
      "≥ 80",
      "Desempeño sólido o superior",
      "from-[#14a34a] to-[#6ee7a0]",
      "bg-verde-bg text-verde",
    ],
    [
      "Seguimiento",
      "60 – 79",
      "Cumple lo esencial; requiere acompañamiento",
      "from-[#f5a300] to-[#ffd84d]",
      "bg-amarillo-bg text-amarillo",
    ],
    [
      "En riesgo",
      "< 60",
      "No alcanza el estándar mínimo",
      "from-[#e53535] to-[#ff7aa8]",
      "bg-rojo-bg text-rojo",
    ],
    [
      "No evaluado",
      "sin datos",
      "Sin evaluaciones completas en ese corte (nunca es 0)",
      "from-[#6b7c99] to-[#b6c5de]",
      "bg-gris-bg text-gris",
    ],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([n, r, d, g, c]) => (
        <div
          key={n}
          className={`relative overflow-hidden rounded-2xl p-4 pt-5 ${c}`}
        >
          <span
            aria-hidden
            className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${g}`}
          />
          <p className="font-cond text-3xl font-extrabold leading-none">{r}</p>
          <p className="mt-1 font-extrabold">{n}</p>
          <p className="text-sm text-ink-2">{d}</p>
        </div>
      ))}
    </div>
  );
}

function Cortes() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        [
          "25 %",
          "Corte 1",
          "Preparación: incorporación, capacitaciones y actividades previas.",
        ],
        [
          "25 %",
          "Corte 2",
          "Seguimiento: desempeño de los días 1 y 2 de sesiones (16 y 17 de noviembre).",
        ],
        [
          "50 %",
          "Evaluación Final",
          "Desempeño de los días 3 y 4 de sesiones (18 y 19 de noviembre).",
        ],
      ].map(([p, t, d]) => (
        <div
          key={t}
          className="rounded-2xl rounded-tr-[6px] border border-line bg-surface-2 p-4 dark:bg-white/[0.05]"
        >
          <p className="texto-grad font-cond text-4xl font-extrabold leading-none">
            {p}
          </p>
          <p className="mt-1 font-extrabold text-ink">{t}</p>
          <p className="text-sm">{d}</p>
        </div>
      ))}
    </div>
  );
}

/** Captura de pantalla de referencia (los nombres y correos de las imágenes son de ejemplo). */
function Figura({ src, alt, pie }: { src: string; alt: string; pie: string }) {
  return (
    <figure className="print:break-inside-avoid">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-card">
        <div
          aria-hidden
          className="flex items-center gap-1.5 border-b border-line bg-surface px-3 py-2"
        >
          <span className="size-2.5 rounded-full bg-rojo/60" />
          <span className="size-2.5 rounded-full bg-amarillo/60" />
          <span className="size-2.5 rounded-full bg-verde/60" />
        </div>
        <img
          src={`/manual/${src}.jpg`}
          alt={alt}
          loading="lazy"
          className="block w-full"
        />
      </div>
      <figcaption className="mt-2 flex gap-2 text-sm text-ink-3">
        <Destello className="mt-0.5 size-3.5 shrink-0 text-acento" />
        {pie}
      </figcaption>
    </figure>
  );
}

/** Captura de teléfono, con marco y ancho contenido. */
function Telefono({
  src,
  alt,
  pie,
}: {
  src: string;
  alt: string;
  pie: string;
}) {
  return (
    <figure className="mx-auto w-full max-w-[17rem] print:break-inside-avoid">
      <div className="overflow-hidden rounded-[2rem] border-[6px] border-ink/80 bg-surface-2 shadow-card">
        <img
          src={`/manual/${src}.jpg`}
          alt={alt}
          loading="lazy"
          className="block w-full"
        />
      </div>
      <figcaption className="mt-2 flex gap-2 text-sm text-ink-3">
        <Destello className="mt-0.5 size-3.5 shrink-0 text-acento" />
        {pie}
      </figcaption>
    </figure>
  );
}

/* ───────────── Contenido ───────────── */

export function ManualPage() {
  const { tema, siguiente } = useTema();
  const [activo, setActivo] = useState<Rol>("conceptos");

  useEffect(() => {
    let previo: string | undefined;
    const antes = () => {
      previo = document.documentElement.dataset.theme;
      document.documentElement.dataset.theme = "light";
    };
    const despues = () => {
      if (previo) document.documentElement.dataset.theme = previo;
    };
    window.addEventListener("beforeprint", antes);
    window.addEventListener("afterprint", despues);
    return () => {
      window.removeEventListener("beforeprint", antes);
      window.removeEventListener("afterprint", despues);
    };
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => e.isIntersecting && setActivo(e.target.id as Rol)),
      { rootMargin: "-30% 0px -60% 0px" },
    );
    ROLES.forEach((r) => {
      const el = document.getElementById(r.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <div className="manual min-h-dvh">
      {/* Portada */}
      <header className="relative isolate overflow-hidden bg-grad-noche px-5 pb-20 pt-8 text-white sm:px-10 print:h-[297mm] print:break-after-page print:px-[16mm]">
        <CieloEstrellado densidad={1.2} className="print:hidden" />
        <img
          src="/brand/anillo.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -right-40 -z-0 w-[40rem] opacity-45 mix-blend-screen [animation:girar_240s_linear_infinite] sm:w-[56rem]"
        />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="flex items-center gap-3 font-black">
            2026 <Destello className="size-5 text-cian" />
            <Marca tipo="estrellas" blanco className="h-9 w-auto" />
          </p>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={siguiente}
              aria-label="Cambiar tema"
              className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 hover:bg-white/20"
            >
              {tema === "dark" ? (
                <IcoSol className="size-5" />
              ) : (
                <IcoLuna className="size-5" />
              )}
            </button>
            <a
              href="/Manual-de-usuario-EyC-MINUME-XVII.pdf"
              download
              className="inline-flex min-h-11 items-center rounded-xl bg-white/10 px-4 font-bold text-white ring-1 ring-white/25 hover:bg-white/20"
            >
              Descargar PDF
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-11 rounded-xl bg-white px-4 font-bold text-[#0043c5]"
            >
              Imprimir
            </button>
          </div>
        </div>
        <div className="relative mx-auto mt-16 max-w-6xl sm:mt-24">
          <p className="sobretitulo text-cian">
            Manual de usuario · Versión 2.1
          </p>
          <h1 className="mt-3 text-[clamp(2.6rem,9vw,6rem)] font-black leading-[0.95] tracking-tight">
            Evaluación
            <br />
            <span className="acento font-normal">y</span> Control
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Marca tipo="lockup" blanco className="h-12 w-auto sm:h-16" />
            <span
              aria-hidden
              className="hidden h-12 w-px bg-white/30 sm:block print:hidden"
            />
            <Marca tipo="footer" blanco className="h-12 w-auto sm:h-14" />
          </div>
          <p className="mt-6 max-w-xl text-lg text-white/85">
            Cómo usar el sistema según tu rol: el equipo de EyC de cada
            comisión, la Subsecretaría de Evaluación y Control, la Secretaría
            General y la administración.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[230px_1fr] lg:px-10 print:block print:p-0">
        {/* Índice */}
        <nav
          aria-label="Índice del manual"
          className="min-w-0 print:hidden lg:sticky lg:top-6 lg:self-start"
        >
          <p className="sobretitulo mb-3 text-acento">Índice</p>
          <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 sin-scrollbar lg:mx-0 lg:flex-col lg:px-0">
            {ROLES.map((r, i) => (
              <li key={r.id} className="shrink-0">
                <a
                  href={`#${r.id}`}
                  className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 font-bold transition ${
                    activo === r.id
                      ? "bg-grad-primario text-white shadow-boton"
                      : "bg-surface text-ink-2 hover:text-ink dark:bg-white/[0.05]"
                  }`}
                >
                  <span className="font-cond text-sm opacity-70 tabular">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {r.corto}
                </a>
              </li>
            ))}
          </ol>
          <Link
            to="/"
            className="mt-4 hidden min-h-11 items-center justify-center rounded-2xl bg-accent-soft px-3 font-bold text-acento lg:flex"
          >
            Ir al sistema →
          </Link>
        </nav>

        <table className="block min-w-0 print:table print:w-full">
          <thead className="hidden print:table-header-group">
            <tr className="print:table-row">
              <td className="print:table-cell">
                <div className="h-[14mm]" />
              </td>
            </tr>
          </thead>
          <tfoot className="hidden print:table-footer-group">
            <tr className="print:table-row">
              <td className="print:table-cell">
                <div className="h-[14mm]" />
              </td>
            </tr>
          </tfoot>
          <tbody className="block print:table-row-group">
            <tr className="block print:table-row">
              <td className="block print:table-cell print:px-[14mm]">
                <main className="flex min-w-0 flex-col gap-16 print:gap-10">
                  {/* 01 · Conceptos */}
                  <Capitulo id="conceptos" n={1} rol={ROLES[0]}>
                    <Seccion
                      titulo="Qué es este sistema y cómo se organiza"
                      donde="Todo el sitio"
                    >
                      <p>
                        El{" "}
                        <strong>Sistema de Evaluación y Control (EyC)</strong>{" "}
                        del MINUME XVII reúne en un solo lugar la evaluación de
                        la <strong>mesa directiva</strong> de cada comisión, el
                        seguimiento que hace la Subsecretaría de Evaluación y
                        Control, las decisiones de continuidad de la Secretaría
                        General y los formularios de opinión. Cada persona entra
                        con su <strong>propia cuenta</strong> y solo ve lo que
                        su rol necesita.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          [
                            "Equipo de EyC",
                            "Evalúa a la mesa directiva de su comisión, crea actividades y recoge opiniones con formularios.",
                          ],
                          [
                            "Subsecretaría (Subse de EyC)",
                            "Monitorea todo el desempeño, registra recomendaciones, define las rotaciones y configura el sistema.",
                          ],
                          [
                            "Secretaría General",
                            "Decide la continuidad en los casos elevados (rojo o sustitución) y consulta el monitoreo.",
                          ],
                          [
                            "Administración",
                            "Crea y cuida las cuentas, tiene todo lo de la Subsecretaría y puede activar el modo mantenimiento.",
                          ],
                        ].map(([t, d]) => (
                          <div
                            key={t}
                            className="rounded-2xl border border-line p-4"
                          >
                            <p className="font-extrabold text-ink">{t}</p>
                            <p className="text-sm">{d}</p>
                          </div>
                        ))}
                      </div>
                      <Nota>
                        Este manual se divide por rol. Lee primero este capítulo
                        y luego el de tu rol. En el índice de la izquierda (o
                        arriba, en el teléfono) puedes saltar entre capítulos.
                      </Nota>
                    </Seccion>

                    <Seccion
                      titulo="Entrar al sistema"
                      donde="Inicio de sesión"
                    >
                      <p>
                        Cada persona tiene su <strong>propia cuenta</strong>;
                        nunca se comparte por comisión. La crea un administrador
                        y tú defines tu contraseña con el enlace que recibes por
                        correo.
                      </p>
                      <Figura
                        src="login"
                        alt="Pantalla de inicio de sesión en computadora"
                        pie="Inicio de sesión: escribe tu correo y tu contraseña."
                      />
                      <Pasos
                        items={[
                          <>
                            Abre el correo{" "}
                            <strong>«Restablecer contraseña»</strong> que
                            recibiste (revisa también <em>spam</em> o{" "}
                            <em>promociones</em>) y toca el enlace. También
                            puedes entrar a{" "}
                            <Ruta>¿Olvidaste tu contraseña?</Ruta> y escribir tu
                            correo para pedir otro.
                          </>,
                          <>
                            Define una contraseña de al menos 10 caracteres. Es
                            personal: no la compartas.
                          </>,
                          <>
                            Entra con tu correo y tu contraseña. El sistema te
                            lleva directo a tu pantalla de inicio según tu rol
                            (EyC: <Ruta>Mi comisión</Ruta>; Subsecretaría,
                            Secretaría General y administración:{" "}
                            <Ruta>Monitoreo</Ruta>).
                          </>,
                        ]}
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Figura
                          src="recuperar"
                          alt="Pantalla para pedir un enlace de recuperación"
                          pie="¿Olvidaste tu contraseña? Escribe tu correo y recibirás un enlace nuevo."
                        />
                        <Telefono
                          src="movil-login"
                          alt="Inicio de sesión en el teléfono"
                          pie="En el teléfono, la misma pantalla se adapta a tu pantalla."
                        />
                      </div>
                      <Nota tipo="ojo">
                        El enlace del correo <strong>caduca</strong> y sirve una
                        sola vez. Si dice que venció, pide uno nuevo desde
                        «¿Olvidaste tu contraseña?». Si el correo no llega,
                        avisa a la administración: puede generarte un enlace
                        directo.
                      </Nota>
                      <Nota tipo="regla">
                        Si te registras por tu cuenta sin que la administración
                        te haya dado un rol, entrarás sin permisos y no verás
                        nada. Las cuentas solo las crea la administración.
                      </Nota>
                    </Seccion>

                    <Seccion
                      titulo="Moverte por el sitio"
                      donde="Barra lateral / barra inferior"
                    >
                      <p>
                        En computadora, el menú está en la{" "}
                        <strong>barra lateral izquierda</strong>: Monitoreo,
                        Decisiones, Comisiones, Personas, Configuración,
                        Formularios y Manual de usuario (cada rol ve solo lo
                        suyo). En el teléfono aparece una{" "}
                        <strong>barra inferior</strong> con las secciones
                        principales y un botón «Más».
                      </p>
                      <Figura
                        src="comision-evaluar"
                        alt="Barra lateral y pantalla de comisión"
                        pie="Barra lateral: tarjeta de fase arriba, menú en el centro y tu cuenta abajo."
                      />
                      <ul className="list-disc space-y-1 pl-5">
                        <li>
                          La <strong>tarjeta de fase</strong> (arriba a la
                          izquierda) dice qué fase está abierta. Tócala para ver
                          todas las fases y sus fechas.
                        </li>
                        <li>
                          Abajo está tu <strong>nombre y rol</strong>, el botón{" "}
                          <B tono="secundario">☾</B> para cambiar entre tema
                          claro y oscuro (se recuerda en ese dispositivo) y{" "}
                          <B tono="secundario">Salir</B>.
                        </li>
                        <li>
                          Los títulos de cada pantalla llevan una palabra en
                          cursiva: es el estilo de la identidad «MINUME de
                          Estrellas».
                        </li>
                      </ul>
                      <Figura
                        src="monitoreo-oscuro"
                        alt="Monitoreo en tema oscuro"
                        pie="El mismo sistema en tema oscuro (☾)."
                      />
                    </Seccion>

                    <Seccion titulo="Fases: cuándo se puede escribir">
                      <p>
                        El proceso avanza por fases. La fase abierta aparece
                        siempre en la <strong>tarjeta de fase</strong>. Cada
                        fase tiene un estado:
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          [
                            "Pendiente",
                            "Aún no empieza. No se puede escribir.",
                            "bg-gris-bg text-gris",
                          ],
                          [
                            "Abierta",
                            "Se puede evaluar, recomendar y decidir según tu rol.",
                            "bg-verde-bg text-verde",
                          ],
                          [
                            "Cerrada",
                            "Bloqueada para todos, incluido el administrador.",
                            "bg-rojo-bg text-rojo",
                          ],
                        ].map(([t, d, c]) => (
                          <div key={t} className={`rounded-2xl p-4 ${c}`}>
                            <p className="font-extrabold">{t}</p>
                            <p className="text-sm text-ink-2">{d}</p>
                          </div>
                        ))}
                      </div>
                      <p>
                        Orden: <strong>Incorporación y preparación</strong> →{" "}
                        <strong>Corte 1</strong> →{" "}
                        <strong>Sesiones días 1 y 2</strong> →{" "}
                        <strong>Corte 2</strong> →{" "}
                        <strong>Sesiones días 3 y 4</strong> →{" "}
                        <strong>Cierre y resultados</strong>.
                      </p>
                      <Nota tipo="ojo">
                        El evento va del{" "}
                        <strong>14 al 19 de noviembre de 2026</strong>, pero las{" "}
                        <strong>
                          sesiones de trabajo empiezan el lunes 16
                        </strong>{" "}
                        (Día 1). El 14 y el 15 no hay sesiones. Se rota los días
                        2 (martes 17) y 3 (miércoles 18).
                      </Nota>
                    </Seccion>

                    <Seccion titulo="Cortes y puntaje final">
                      <Cortes />
                      <p>
                        <strong>
                          Puntaje final = Corte 1 × 25 % + Corte 2 × 25 % +
                          Final × 50 %.
                        </strong>{" "}
                        Mientras falte cualquiera de los tres, el puntaje final
                        aparece como <strong>«En espera»</strong>, nunca como un
                        número bajo.
                      </p>
                      <Nota tipo="regla">
                        El sistema calcula todo. Ninguna pantalla hace cuentas
                        propias: dos personas siempre ven el mismo número.
                      </Nota>
                    </Seccion>

                    <Seccion titulo="El semáforo">
                      <p>
                        Cada corte tiene su propio semáforo. Siempre muestra
                        color, etiqueta, puntaje y cuántas evaluaciones hay
                        detrás.
                      </p>
                      <Semaforos />
                      <Nota>
                        Una sola evaluación de 100 no pesa igual que diez.
                        Fíjate siempre en el número entre paréntesis (la
                        cantidad de evaluaciones).
                      </Nota>
                    </Seccion>

                    <Seccion titulo="La rúbrica de la mesa directiva: nueve criterios">
                      <p>
                        Todas las personas de la mesa se evalúan con{" "}
                        <strong>la misma rúbrica</strong>, cualquiera que sea su
                        cargo y la comisión en la que estén ese día. Los
                        criterios están en tres secciones y los puntos suman
                        100.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          [
                            "Conducción de la sesión",
                            "Dominio procedimental · 15",
                            "Conducción del debate · 15",
                            "Manejo del tiempo · 10",
                          ],
                          [
                            "Decisiones y trato",
                            "Imparcialidad · 10",
                            "Manejo de situaciones difíciles · 10",
                            "Criterio · 10",
                          ],
                          [
                            "Equipo y evaluación",
                            "Comunicación · 10",
                            "Trabajo en equipo · 10",
                            "Capacidad de evaluación · 10",
                          ],
                        ].map(([t, ...cs]) => (
                          <div
                            key={t}
                            className="rounded-2xl rounded-tr-[6px] bg-surface-2 p-4 dark:bg-white/[0.05]"
                          >
                            <p className="sobretitulo text-acento">{t}</p>
                            <ul className="mt-2 flex flex-col gap-1 text-sm font-semibold text-ink">
                              {cs.map((c) => (
                                <li key={c}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <p>
                        Cada criterio recibe una{" "}
                        <strong>nota de 0 hasta sus puntos</strong> y{" "}
                        <strong>siempre una descripción</strong> de lo
                        observado. Si un criterio no se pudo observar, se marca{" "}
                        <B tono="secundario">N/A</B> y también se explica por
                        qué.
                      </p>
                      <Nota tipo="regla">
                        <strong>N/A no es cero.</strong> El criterio sale del
                        cálculo y el resto se reescala a 100. Ejemplo: si solo
                        se observaron «Dominio procedimental» (15 puntos) con 15
                        e «Imparcialidad» (10 puntos) con 5, el puntaje es 20 de
                        25 = 80.
                      </Nota>
                      <p>
                        La rúbrica de los miembros de EyC es distinta: sus seis
                        dimensiones (A a F) se responden con <B>Sí</B> <B>No</B>{" "}
                        o <B tono="secundario">N/O</B>.
                      </p>
                    </Seccion>

                    <Seccion titulo="Si ves «Estamos mejorando el sitio»">
                      <p>
                        Cuando el equipo está haciendo cambios, el sitio muestra
                        una pantalla de <strong>mantenimiento</strong> con la
                        indicación de esperar unos momentos. No cierres la
                        página: <strong>se actualiza sola</strong> y vuelve a la
                        normalidad cuando todo esté listo (revisa cada pocos
                        segundos). Mientras tanto no se pierde nada de lo ya
                        guardado.
                      </p>
                      <Figura
                        src="mantenimiento-escritorio"
                        alt="Pantalla de mantenimiento"
                        pie="Pantalla de espera durante un mantenimiento."
                      />
                    </Seccion>
                  </Capitulo>

                  {/* 02 · EyC */}
                  <Capitulo id="eyc" n={2} rol={ROLES[1]}>
                    <Seccion
                      titulo="Tu pantalla: Mi comisión"
                      donde="Mi comisión"
                    >
                      <p>
                        Al entrar ves tu comisión con cuatro pestañas. En el
                        teléfono es la pantalla principal y todo se puede hacer
                        con el pulgar.
                      </p>
                      <Figura
                        src="comision-evaluar"
                        alt="Pantalla de una comisión, pestaña Evaluar"
                        pie="Pestaña Evaluar: eliges la actividad (píldoras) y ves a cada persona con su estado."
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          [
                            "Evaluar",
                            "Antes del evento, por actividad. Durante el evento, «Hoy en tu comisión».",
                          ],
                          [
                            "Mesa directiva",
                            "Quién está asignado ahora, su semáforo y el historial de cargos.",
                          ],
                          [
                            "Actividades",
                            "Crear, editar, cerrar y reabrir talleres, capacitaciones y reuniones.",
                          ],
                          [
                            "Histórico",
                            "Evaluaciones de cualquier persona que pasó por tu comisión.",
                          ],
                        ].map(([t, d]) => (
                          <div
                            key={t}
                            className="rounded-2xl border border-line p-4"
                          >
                            <p className="font-extrabold text-ink">{t}</p>
                            <p className="text-sm">{d}</p>
                          </div>
                        ))}
                      </div>
                      <Telefono
                        src="movil-comision"
                        alt="Mi comisión en el teléfono"
                        pie="En el teléfono: tarjetas grandes y fáciles de tocar."
                      />
                    </Seccion>

                    <Seccion
                      titulo="Mesa directiva e histórico"
                      donde="Mi comisión › Mesa directiva · Histórico"
                    >
                      <p>
                        <strong>Mesa directiva</strong> lista a quienes están
                        asignados hoy a tu comisión (Director, Director Adjunto
                        I, Director Adjunto II y Miembro Aprendiz), con su
                        semáforo del corte actual. Al tocar un nombre abres su{" "}
                        <strong>ficha</strong>.
                      </p>
                      <Figura
                        src="comision-mesa"
                        alt="Pestaña Mesa directiva"
                        pie="Mesa directiva: cargo, semáforo y acceso a la ficha de cada persona."
                      />
                      <p>
                        <strong>Histórico</strong> muestra todas las
                        evaluaciones hechas en tu comisión (incluidas las de
                        personas que ya rotaron), para revisar o completar lo
                        pendiente.
                      </p>
                      <Figura
                        src="comision-historico"
                        alt="Pestaña Histórico"
                        pie="Histórico: todas las evaluaciones de la comisión, con su estado."
                      />
                    </Seccion>

                    <Seccion
                      titulo="La ficha de una persona"
                      donde="Mesa directiva › nombre"
                    >
                      <p>
                        La ficha reúne todo de una persona: comisión y cargo
                        actuales, su <strong>puntaje final</strong> (o «En
                        espera»), los tres cortes con su semáforo, el historial
                        de cargos y cada evaluación recibida.
                      </p>
                      <Figura
                        src="ficha-persona"
                        alt="Ficha de una persona"
                        pie="Ficha: puntaje final, cortes, historial y evaluaciones."
                      />
                    </Seccion>

                    <Seccion
                      titulo="Crear una actividad (antes del evento)"
                      donde="Mi comisión › Actividades"
                    >
                      <Figura
                        src="eyc-actividades"
                        alt="Pestaña Actividades"
                        pie="Actividades: crea y gestiona los talleres y reuniones de tu comisión."
                      />
                      <Pasos
                        items={[
                          <>
                            Escribe el nombre (por ejemplo «Segunda
                            capacitación»), elige el tipo y la fecha.
                          </>,
                          <>
                            Toca <B>Crear</B>. Aparece en la lista como{" "}
                            <strong>Abierta</strong>.
                          </>,
                          <>
                            Si te equivocaste, toca{" "}
                            <B tono="secundario">Editar</B>. Cuando ya evaluaste
                            a todos, toca <B tono="secundario">Cerrar</B>{" "}
                            (puedes reabrirla mientras la fase siga abierta).
                          </>,
                        ]}
                      />
                      <p>
                        Cada actividad se evalúa con la rúbrica vigente. Toca{" "}
                        <B tono="secundario">Ver rúbrica</B> para ver las
                        secciones, los criterios y cuántos puntos vale cada uno{" "}
                        <em>antes</em> de evaluar.
                      </p>
                      <Figura
                        src="modal-rubrica"
                        alt="Ventana con la rúbrica"
                        pie="«Ver rúbrica»: los nueve criterios, agrupados en secciones y con sus puntos."
                      />
                      <Nota tipo="ojo">
                        Solo puedes crear actividades mientras la fase de
                        preparación esté abierta.
                      </Nota>
                    </Seccion>

                    <Seccion
                      titulo="Evaluar a una persona"
                      donde="Mi comisión › Evaluar"
                    >
                      <Pasos
                        items={[
                          <>
                            Antes del evento, toca la{" "}
                            <strong>píldora de la actividad</strong> (la más
                            reciente ya viene elegida). Durante el evento verás
                            directamente «Hoy en tu comisión».
                          </>,
                          <>
                            Toca <B>Evaluar</B> (o <B>Continuar</B> si ya hay un
                            borrador, o <B tono="secundario">Ver</B> si ya está
                            completa) junto a la persona.
                          </>,
                          <>
                            Abre cada criterio, escribe su <strong>nota</strong>{" "}
                            (de 0 hasta sus puntos, o con los botones de nota
                            rápida) y{" "}
                            <strong>describe lo que observaste</strong>. Si no
                            pudiste observarlo, marca{" "}
                            <B tono="secundario">N/A</B> y explica por qué.
                          </>,
                          <>
                            La descripción es obligatoria en todos los
                            criterios, también en N/A. Mientras falte alguna, el
                            criterio se marca y el sistema te lleva hasta él.
                          </>,
                          <>
                            Toca <B tono="secundario">Guardar borrador</B> si
                            vas a seguir luego, o <B>Marcar completa</B> al
                            terminar.
                          </>,
                        ]}
                      />
                      <Figura
                        src="evaluar-formulario"
                        alt="Formulario de evaluación"
                        pie="Evaluación: criterios agrupados en secciones, con el progreso arriba."
                      />
                      <Figura
                        src="evaluar-criterio"
                        alt="Un criterio abierto"
                        pie="Criterio abierto: nota de 0 a sus puntos, botones rápidos, N/A y descripción obligatoria."
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Telefono
                          src="movil-evaluar"
                          alt="Evaluación en el teléfono"
                          pie="En el teléfono la evaluación usa toda la pantalla."
                        />
                        <Telefono
                          src="movil-evaluar-criterio"
                          alt="Criterio en el teléfono"
                          pie="Cada criterio se abre como un acordeón."
                        />
                      </div>
                      <Nota>
                        La barra inferior muestra el progreso. Si falta algo, el
                        sistema lo lista con enlaces directos al criterio
                        pendiente; nada se pierde porque primero se guarda como
                        borrador.
                      </Nota>
                      <Nota tipo="regla">
                        Solo cuentan para el promedio las evaluaciones
                        completas. Los borradores aparecen aparte.
                      </Nota>
                    </Seccion>

                    <Seccion
                      titulo="Durante el evento: rotaciones"
                      donde="Mi comisión › Evaluar"
                    >
                      <p>
                        <strong>No rota la mesa completa:</strong> cada miembro
                        de mesa pasa a una comisión distinta los días 2 y 3 de
                        sesiones. Los miembros de EyC y los aprendices se quedan
                        fijos en su comisión, y la CIJ no rota. Tú evalúas a
                        quien estuvo en <strong>tu comisión ese día</strong>. Si
                        alguien rotó a media jornada, se evalúa donde estuvo más
                        tiempo; el sistema lo indica con «rotó: su jornada se
                        evalúa en la otra comisión».
                      </p>
                      <p>
                        Puedes elegir jornadas pasadas en las píldoras de días
                        para completar evaluaciones pendientes.
                      </p>
                      <Nota tipo="regla">
                        La rúbrica y los criterios son los mismos todos los
                        días. Lo único que cambia es la posición de la persona y
                        quién la evalúa.
                      </Nota>
                    </Seccion>

                    <Seccion
                      titulo="Formularios: recoger opiniones"
                      donde="Formularios"
                    >
                      <p>
                        Cualquier rol puede crear un formulario para recoger
                        feedback de una sesión o taller. Van dirigidos a los{" "}
                        <strong>delegados de una comisión</strong> (y, si
                        quieres, a miembros de mesa, aprendices o EyC). Quien
                        responde <strong>no necesita cuenta</strong>: entra con
                        el enlace o el código QR, elige quién es, responde y
                        sale.
                      </p>
                      <Figura
                        src="formularios-lista"
                        alt="Lista de formularios"
                        pie="Formularios: cada uno con su enlace, número de respuestas y acciones (Copiar enlace, Duplicar, Cerrar, Eliminar)."
                      />
                      <Pasos
                        items={[
                          <>
                            Entra a <Ruta>Formularios</Ruta> y toca{" "}
                            <B>Nuevo formulario</B>. Ponle un título y toca{" "}
                            <B>Crear y diseñar</B>.
                          </>,
                          <>
                            Marca <strong>quién puede responder</strong>{" "}
                            (delegado, miembro de mesa, aprendiz, EyC, otro).
                            Quien entra elige su rol; puedes hacer que una
                            pregunta la responda solo un rol.
                          </>,
                          <>
                            En <strong>Comisión del formulario</strong> elige
                            «La elige quien responde» (un formulario compartido)
                            o fíjalo a una comisión: el enlace ya trae la
                            comisión y no se la pregunta.
                          </>,
                          <>
                            Agrega las preguntas con los botones: texto corto,
                            párrafo, número, fecha,{" "}
                            <strong>opción única</strong>,{" "}
                            <strong>casillas</strong>, lista desplegable,{" "}
                            <strong>escala</strong>, sí/no y{" "}
                            <strong>persona de la comisión</strong>. Reordénalas
                            con ↑ ↓ y marca cuáles son obligatorias.
                          </>,
                          <>
                            Revisa «Así lo verá quien responde», toca{" "}
                            <B>Guardar formulario</B> y comparte el{" "}
                            <strong>enlace</strong> o el{" "}
                            <strong>código QR</strong>.
                          </>,
                        ]}
                      />
                      <Figura
                        src="formulario-constructor"
                        alt="Constructor de formularios"
                        pie="Constructor: datos del formulario, preguntas, enlace con QR y vista previa."
                      />
                      <p>
                        El campo <strong>«Persona de la comisión»</strong> sirve
                        para preguntas como «¿Quién dio el taller?»: quien
                        responde elige entre las personas registradas en la
                        comisión (con su cargo) o marca <strong>«Otro»</strong>{" "}
                        y escribe el nombre si fue alguien externo.
                      </p>
                      <Figura
                        src="formulario-publico-lleno"
                        alt="Formulario público respondido en el teléfono"
                        pie="Así lo responde una persona sin cuenta, desde el teléfono."
                      />
                      <p>
                        En <B tono="secundario">Resultados</B> ves el resumen
                        por pregunta (barras, promedios, personas más
                        mencionadas), cada respuesta y puedes descargar todo en{" "}
                        <strong>CSV</strong>. <B tono="secundario">Cerrar</B>{" "}
                        deja de recibir respuestas sin perder lo recogido;{" "}
                        <B tono="secundario">Duplicar</B> crea una copia cerrada
                        (útil para «Taller 1», «Taller 2» o una copia por
                        comisión).
                      </p>
                      <Figura
                        src="formulario-resultados"
                        alt="Resultados de un formulario"
                        pie="Resultados: resumen por pregunta y tabla de respuestas."
                      />
                      <Nota tipo="regla">
                        Las respuestas las ven quien creó el formulario, la
                        Subsecretaría, la Secretaría General y la
                        administración. No se muestra desde qué dispositivo se
                        respondió, y el sistema limita los envíos repetidos.
                      </Nota>
                      <Nota tipo="ojo">
                        El feedback de un formulario{" "}
                        <strong>no cambia la nota</strong> de nadie por sí solo:
                        el equipo de EyC lee las respuestas y saca sus
                        conclusiones.
                      </Nota>
                    </Seccion>

                    <Seccion
                      titulo="Recomendar en los cortes"
                      donde="Mi comisión › Mesa directiva"
                    >
                      <Pasos
                        items={[
                          <>
                            Cuando la fase de corte esté abierta, aparece el
                            botón <B tono="secundario">Recomendar</B> junto a
                            cada persona (según tu rol).
                          </>,
                          <>
                            Elige <strong>Continúa</strong>,{" "}
                            <strong>Seguimiento</strong>,{" "}
                            <strong>Sustitución</strong> o{" "}
                            <strong>No evaluado</strong>.
                          </>,
                          <>
                            El comentario es obligatorio con semáforo amarillo o
                            rojo y en toda sustitución.
                          </>,
                        ]}
                      />
                      <Nota tipo="ojo">
                        Los casos en rojo o de sustitución se elevan
                        automáticamente a la Secretaría General.
                      </Nota>
                    </Seccion>
                  </Capitulo>

                  {/* 03 · Subsecretaría */}
                  <Capitulo id="subse" n={3} rol={ROLES[2]}>
                    <Seccion
                      titulo="Monitoreo: el resumen (dashboard)"
                      donde="Monitoreo › Resumen"
                    >
                      <p>
                        El <strong>Resumen</strong> es el panel con las cifras
                        clave de un vistazo. Arriba eliges el{" "}
                        <strong>corte</strong> y el <strong>ámbito</strong>{" "}
                        (Mesa directiva o Equipo de EyC); todo se recalcula al
                        instante. Las cifras las calcula la base de datos, así
                        que son las mismas que ve cualquier otra persona con
                        permiso.
                      </p>
                      <Figura
                        src="monitoreo-resumen"
                        alt="Dashboard de monitoreo"
                        pie="Resumen de monitoreo: indicadores, semáforo, distribución, comisiones, cargos, criterios y rankings."
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          [
                            "Personas evaluadas",
                            "Cuántas tienen al menos una evaluación completa en el corte, con su aro de avance.",
                          ],
                          [
                            "Promedio del corte",
                            "Promedio de los puntajes, con mediana y rango (mínimo a máximo). Su color sigue los umbrales del corte.",
                          ],
                          [
                            "Evaluaciones completas",
                            "Total de evaluaciones completas y borradores, y la cobertura de la fase abierta (completas de esperadas).",
                          ],
                          [
                            "Casos por atender",
                            "Elevados sin decidir más personas en rojo sin recomendación: lo que requiere acción.",
                          ],
                          [
                            "Semáforo del corte",
                            "Rosquilla con cuántas personas hay en Cumple, Seguimiento, En riesgo y No evaluado.",
                          ],
                          [
                            "Distribución de puntajes",
                            "Cuántas personas hay en cada tramo de 10 puntos, coloreado por la banda del semáforo.",
                          ],
                          [
                            "Promedio por comisión",
                            "Barras ordenadas de mayor a menor; la marca vertical es el promedio general y los círculos cuentan cuántos hay en verde, amarillo y rojo.",
                          ],
                          [
                            "Evolución del promedio",
                            "El promedio de las evaluaciones completas día por día, con las líneas de los umbrales.",
                          ],
                          [
                            "Promedio por cargo",
                            "Compara Director, Adjuntos y Aprendiz.",
                          ],
                          [
                            "Desempeño por criterio",
                            "Logro promedio de cada criterio de la rúbrica, por sección; resalta el más débil para reforzar.",
                          ],
                          [
                            "Mejores puntajes / Requieren atención",
                            "Las cinco personas con mayor y menor puntaje; tocas un nombre para abrir su ficha.",
                          ],
                        ].map(([t, d]) => (
                          <div
                            key={t}
                            className="rounded-2xl border border-line p-4"
                          >
                            <p className="font-extrabold text-ink">{t}</p>
                            <p className="text-sm">{d}</p>
                          </div>
                        ))}
                      </div>
                      <Nota>
                        Pasa el cursor (o mantén el dedo) sobre una barra, un
                        punto o un tramo para ver su detalle. Si no hay datos
                        todavía, cada gráfica lo dice en lugar de mostrar ceros.
                      </Nota>
                    </Seccion>

                    <Seccion
                      titulo="Monitoreo: el semáforo por persona"
                      donde="Monitoreo › Semáforo"
                    >
                      <p>
                        Arriba eliges el <strong>corte</strong>. Las cuatro
                        tarjetas de color cuentan cuántas personas hay en cada
                        semáforo: <strong>tócalas para filtrar</strong>. En el
                        teléfono, los demás filtros están en «Más filtros».
                      </p>
                      <Figura
                        src="monitoreo-semaforo"
                        alt="Lista de personas por semáforo"
                        pie="Semáforo: personas agrupadas por color, con puntaje, borradores, continuidad y recomendación."
                      />
                      <p>
                        Cada fila muestra semáforo, borradores, estatus de
                        continuidad y recomendación. Toca el nombre para abrir
                        la ficha completa. Con{" "}
                        <B tono="secundario">Recomendar</B> registras la
                        recomendación:
                      </p>
                      <Figura
                        src="modal-recomendar"
                        alt="Ventana para recomendar"
                        pie="Recomendar: eliges la recomendación y escribes el comentario (obligatorio en amarillo, rojo y sustitución)."
                      />
                    </Seccion>

                    <Seccion
                      titulo="Cobertura: ¿quién va al día?"
                      donde="Monitoreo › Cobertura"
                    >
                      <p>
                        Por comisión y fase: evaluaciones{" "}
                        <strong>completas</strong>, <strong>borradores</strong>{" "}
                        y <strong>esperadas</strong>. Antes del evento se espera
                        una por actividad y persona; durante el evento, una por
                        jornada y persona.
                      </p>
                      <Figura
                        src="monitoreo-cobertura"
                        alt="Cobertura por comisión"
                        pie="Cobertura: barras de avance por comisión (verde = al día)."
                      />
                    </Seccion>

                    <Seccion
                      titulo="Evaluar al equipo de EyC"
                      donde="Monitoreo › Evaluar EyC"
                    >
                      <p>
                        Funciona igual que la evaluación de la mesa: por
                        actividad antes del evento (crea actividades de EyC ahí
                        mismo) y por jornada durante el evento.
                      </p>
                      <Figura
                        src="monitoreo-evaluar-eyc"
                        alt="Evaluar al equipo de EyC"
                        pie="Evaluar EyC: la lista de miembros de EyC con su semáforo."
                      />
                    </Seccion>

                    <Seccion titulo="Comisiones" donde="Comisiones">
                      <p>
                        La Subsecretaría, la Secretaría General y la
                        administración ven <strong>todas las comisiones</strong>
                        ; al elegir una abres la misma pantalla que ve su equipo
                        de EyC.
                      </p>
                      <Figura
                        src="comisiones"
                        alt="Lista de comisiones"
                        pie="Comisiones: una tarjeta por comisión con su avance."
                      />
                    </Seccion>

                    <Seccion titulo="Personas y asignaciones" donde="Personas">
                      <Figura
                        src="personas-asignaciones"
                        alt="Personas y asignaciones"
                        pie="Asignaciones: quién está en qué comisión y con qué cargo."
                      />
                      <Pasos
                        items={[
                          <>
                            <strong>Carga masiva:</strong> pega una línea por
                            persona:{" "}
                            <Ruta>Nombre; comisión; cargo; correo</Ruta>. Revisa
                            la vista previa y registra (todo o nada).
                          </>,
                          <>
                            <strong>Alta individual:</strong> para una sola
                            persona.
                          </>,
                          <>
                            <strong>Mover</strong> (en Asignaciones): ajuste o
                            asignación inicial de una persona. Si el cargo
                            destino está ocupado, elige{" "}
                            <strong>Intercambiar</strong>.
                          </>,
                          <>
                            <strong>Editar</strong>: cambia nombre, correo o
                            notas. El historial no se pierde nunca.
                          </>,
                        ]}
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Figura
                          src="personas-alta"
                          alt="Alta individual"
                          pie="Alta individual de una persona."
                        />
                        <Figura
                          src="personas-carga"
                          alt="Carga masiva"
                          pie="Carga masiva: pega, revisa la vista previa y registra."
                        />
                      </div>
                      <Nota>
                        Cargos válidos: director, adjunto1, adjunto2, aprendiz,
                        eyc. Comisión por clave o sigla (ctd, PNUD…).
                      </Nota>
                    </Seccion>

                    <Seccion
                      titulo="Calificación inicial"
                      donde="Personas › Calificación inicial"
                    >
                      <p>
                        Es la nota con la que se definen los cargos del{" "}
                        <strong>Día 1</strong>, antes de que haya evaluaciones
                        de sesión. Se compone de tres partes:
                      </p>
                      <ul className="list-disc space-y-1 pl-5">
                        <li>
                          <strong>Examen (50 %)</strong>: lo escribes tú.
                        </li>
                        <li>
                          <strong>Evaluación institucional (30 %)</strong>: sale
                          sola de la nota del Corte 1.
                        </li>
                        <li>
                          <strong>Pares (20 %)</strong>: la evaluación entre
                          pares, la escribes tú.
                        </li>
                      </ul>
                      <Figura
                        src="personas-calificacion"
                        alt="Calificación inicial"
                        pie="Calificación inicial: examen y pares se escriben; la institucional y el total se calculan."
                      />
                      <p>
                        Puedes <strong>pegar las notas desde Excel</strong>{" "}
                        (botón de pegado) y ajustar los porcentajes. El total
                        aparece solo cuando están las tres notas; mientras falte
                        una, queda vacío (nunca cuenta como cero).
                      </p>
                    </Seccion>

                    <Seccion titulo="Rotaciones" donde="Personas › Rotaciones">
                      <p>
                        Eliges el <strong>Día 2</strong> o el{" "}
                        <strong>Día 3</strong> de sesiones. La rotación es{" "}
                        <strong>manual e individual</strong>: tú decides a qué
                        comisión y con qué cargo pasa cada miembro de mesa.
                        Junto a cada persona ves su <strong>puntuación</strong>{" "}
                        (calificación inicial y valoración de EyC) para decidir
                        con datos.
                      </p>
                      <Figura
                        src="personas-rotaciones"
                        alt="Planificador de rotaciones"
                        pie="Rotaciones: cada persona con su puntuación y un selector de destino; los fijos aparecen aparte."
                      />
                      <Pasos
                        items={[
                          <>
                            Elige el día y, en la columna «Pasa a», el lugar de
                            cada persona (comisión y cargo).
                          </>,
                          <>
                            Si eliges el lugar de otra persona, ella recibe el
                            que tú dejas (intercambio automático).
                          </>,
                          <>
                            El sistema te avisa si alguien vuelve a una comisión
                            que ya conoció (<em>«ya estuvo ahí»</em>).
                          </>,
                          <>
                            Toca <B>Aplicar rotación</B>. Solo se puede aplicar
                            cuando hay una fase de evento abierta.
                          </>,
                        ]}
                      />
                      <p>
                        Los <strong>pesos de la puntuación</strong> de cada día
                        (por defecto Día 2: 70 % inicial y 30 % EyC; Día 3: 40 %
                        y 60 %) y las <strong>reglas de rotación</strong>{" "}
                        (primer día de sesiones y comisiones que no rotan) se
                        ajustan al final de esta misma pestaña.
                      </p>
                      <Nota tipo="regla">
                        La rotación es individual. Los EyC, los aprendices y las
                        comisiones marcadas como «no rota» (CIJ) se quedan
                        fijos. El Día 1 de sesiones (lunes 16 de noviembre) cada
                        quien está en su comisión; los días 2 y 3 se rota.
                      </Nota>
                    </Seccion>

                    <Seccion
                      titulo="Recomendaciones y decisiones"
                      donde="Monitoreo · Decisiones"
                    >
                      <p>
                        Registras recomendaciones desde Monitoreo. En{" "}
                        <Ruta>Decisiones</Ruta> cierras los casos de{" "}
                        <strong>Continúa</strong> y <strong>Seguimiento</strong>
                        ; los de rojo o sustitución los ves pero los decide la
                        Secretaría General.
                      </p>
                      <p>
                        Tras una decisión de sustitución puedes registrar a la
                        persona entrante desde su ficha con{" "}
                        <B tono="peligro">Registrar sustitución</B>.
                      </p>
                    </Seccion>

                    <Seccion titulo="Configuración" donde="Configuración">
                      <p>
                        Todo cambio queda auditado y lo que afecta cálculos pide
                        confirmación. Las pestañas son:
                      </p>
                      <Figura
                        src="config-fases"
                        alt="Configuración: fases y evento"
                        pie="Fases y evento: abrir y cerrar fases, fechas del evento, método de promedio y (administración) modo mantenimiento."
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          [
                            "Fases y evento",
                            "Abrir y cerrar fases, fechas, primer día de sesiones y método de promedio.",
                          ],
                          [
                            "Pesos",
                            "Puntos de cada criterio (mesa) y pesos de EyC; deben sumar 100.",
                          ],
                          [
                            "Cortes y umbrales",
                            "Peso de cada corte y bandas del semáforo.",
                          ],
                          [
                            "Criterios",
                            "Texto y respuesta esperada; cada cambio guarda versión.",
                          ],
                          [
                            "Comisiones y catálogos",
                            "Nombres, secciones y competencias de las dimensiones.",
                          ],
                          [
                            "Auditoría",
                            "Quién cambió qué y cuándo, con valores anteriores.",
                          ],
                        ].map(([t, d]) => (
                          <div
                            key={t}
                            className="rounded-2xl border border-line p-4"
                          >
                            <p className="font-extrabold text-ink">{t}</p>
                            <p className="text-sm">{d}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Figura
                          src="config-pesos"
                          alt="Pesos"
                          pie="Pesos: los 9 criterios de la mesa suman 100 puntos."
                        />
                        <Figura
                          src="config-cortes"
                          alt="Cortes y umbrales"
                          pie="Cortes y umbrales: peso de cada corte y bandas del semáforo."
                        />
                        <Figura
                          src="config-criterios"
                          alt="Criterios"
                          pie="Criterios: texto y versión de cada uno."
                        />
                        <Figura
                          src="config-catalogos"
                          alt="Comisiones y catálogos"
                          pie="Comisiones y catálogos: nombres y secciones."
                        />
                      </div>
                      <Figura
                        src="config-auditoria"
                        alt="Auditoría"
                        pie="Auditoría: cada cambio con autor, fecha y valores antes y después."
                      />
                      <Nota tipo="regla">
                        Cerrar una fase bloquea toda escritura de ese período.
                        Para corregir algo, reábrela, corrige y vuelve a
                        cerrarla.
                      </Nota>
                    </Seccion>
                  </Capitulo>

                  {/* 04 · Secretaría General */}
                  <Capitulo id="sg" n={4} rol={ROLES[3]}>
                    <Seccion
                      titulo="Tu bandeja de decisiones"
                      donde="Decisiones"
                    >
                      <p>
                        Por defecto ves{" "}
                        <strong>los casos que te toca decidir</strong>: semáforo
                        rojo o recomendación de sustitución. Los elevados
                        pendientes tienen borde rojo.
                      </p>
                      <Figura
                        src="decisiones"
                        alt="Bandeja de decisiones"
                        pie="Decisiones: cada caso con su semáforo, puntaje, recomendación y comentario."
                      />
                      <Pasos
                        items={[
                          <>
                            Toca <B tono="secundario">Ver historial completo</B>{" "}
                            para revisar los tres cortes, el estatus y el
                            puntaje final antes de decidir.
                          </>,
                          <>
                            Toca <B>Decidir</B> y elige{" "}
                            <strong>Continúa</strong>,{" "}
                            <strong>Seguimiento</strong> o{" "}
                            <strong>Sustitución</strong>.
                          </>,
                          <>
                            Escribe el comentario (obligatorio en casos
                            elevados). Queda guardado con tu nombre y la fecha.
                          </>,
                          <>
                            Si decides sustitución, puedes registrar en el mismo
                            paso a la persona que entra al cargo.
                          </>,
                        ]}
                      />
                      <Figura
                        src="modal-decidir"
                        alt="Ventana de decisión"
                        pie="Decidir: eliges la decisión y escribes el comentario."
                      />
                      <Nota tipo="regla">
                        Una decisión no se puede editar. El estatus de
                        continuidad de la persona pasa a ser tu última decisión.
                      </Nota>
                    </Seccion>
                    <Seccion titulo="Consultar" donde="Monitoreo · Comisiones">
                      <p>
                        Puedes ver el monitoreo (incluido el resumen), la
                        cobertura, cada comisión y cada ficha, pero no editar
                        evaluaciones ni configuración.
                      </p>
                      <Figura
                        src="sg-monitoreo"
                        alt="Monitoreo visto por la Secretaría General"
                        pie="Monitoreo en modo consulta."
                      />
                    </Seccion>
                  </Capitulo>

                  {/* 05 · Administración */}
                  <Capitulo id="admin" n={5} rol={ROLES[4]}>
                    <Seccion
                      titulo="Crear y administrar cuentas"
                      donde="Configuración › Cuentas"
                    >
                      <Figura
                        src="config-cuentas"
                        alt="Cuentas del sistema"
                        pie="Cuentas: crea cuentas y gestiona su acceso."
                      />
                      <Pasos
                        items={[
                          <>
                            Si es un miembro de EyC ya registrado, elígelo en{" "}
                            <strong>Persona ya registrada</strong>: la cuenta
                            toma su nombre, correo y comisión y queda vinculada
                            a su ficha. Si no, escribe nombre y correo y elige
                            el rol (y la comisión si es EyC).
                          </>,
                          <>
                            Toca <B>Crear</B>: aparece un{" "}
                            <strong>enlace de acceso</strong>. Cópialo y envíalo
                            solo a esa persona. Para que reciba el correo, usa
                            también «¿Olvidaste tu contraseña?» con su correo.
                          </>,
                          <>
                            Si se pierde o caduca, usa{" "}
                            <B tono="secundario">Enlace</B> en su fila.{" "}
                            <B tono="secundario">Bloquear</B> le quita el acceso
                            sin borrar su historial.
                          </>,
                          <>
                            <B tono="peligro">Eliminar</B> borra la cuenta
                            definitivamente (pide confirmación). Solo funciona
                            si la cuenta <strong>no tiene actividad</strong>; si
                            ya evaluó, decidió o creó actividades, el sistema te
                            indica que uses <strong>Bloquear</strong> para
                            conservar el historial. No puedes eliminar tu propia
                            cuenta ni al último administrador.
                          </>,
                        ]}
                      />
                      <Nota tipo="regla">
                        Nunca se crean cuentas compartidas. Quien se registra
                        por su cuenta queda sin rol y sin acceso.
                      </Nota>
                      <p>
                        Con <B tono="secundario">Editar</B> cambias nombre, rol,
                        comisión y correo. Las cuentas marcadas{" "}
                        <strong>«Sin activar»</strong> aún no entraron: su
                        correo se puede corregir y se genera un enlace nuevo.
                      </p>
                      <Nota tipo="ojo">
                        Cuando la persona ya activó su cuenta, su correo queda
                        fijo para proteger su acceso.
                      </Nota>
                    </Seccion>

                    <Seccion
                      titulo="Modo mantenimiento"
                      donde="Configuración › Fases y evento"
                    >
                      <p>
                        Cuando vayas a hacer cambios, activa el{" "}
                        <strong>modo mantenimiento</strong>: todas las personas
                        (menos los administradores) ven la pantalla «Estamos
                        mejorando el sitio… espera unos momentos». Es una
                        tarjeta al final de <Ruta>Fases y evento</Ruta>.
                      </p>
                      <Pasos
                        items={[
                          <>
                            Escribe, si quieres, un mensaje corto (por ejemplo
                            «Volvemos en 10 minutos»).
                          </>,
                          <>
                            Toca <B tono="peligro">Activar mantenimiento</B> y
                            confirma. En menos de 20 segundos todas las personas
                            conectadas ven la pantalla de espera; los
                            formularios públicos también se pausan.
                          </>,
                          <>
                            Tú sigues trabajando con un aviso rojo arriba. Al
                            terminar, toca <B>Apagar y reabrir el sitio</B>: las
                            pantallas de espera se actualizan solas y vuelven a
                            la normalidad.
                          </>,
                        ]}
                      />
                      <Nota tipo="ojo">
                        Viene apagado. Quien necesite entrar durante un
                        mantenimiento (solo administradores) usa el enlace
                        «Acceso de administración» de la pantalla de espera.
                      </Nota>
                    </Seccion>

                    <Seccion
                      titulo="Editar comisiones y cargos"
                      donde="Configuración › Comisiones y catálogos"
                    >
                      <p>
                        Cambia el <strong>nombre</strong> y la{" "}
                        <strong>sigla</strong> de una comisión (también desde su
                        página con <B tono="secundario">Editar comisión</B>),
                        márcala inactiva o renombra los cargos. La clave interna
                        no cambia para no romper la carga masiva.
                      </p>
                    </Seccion>
                    <Seccion titulo="Todo lo de Subsecretaría">
                      <p>
                        El administrador tiene además todas las funciones del
                        capítulo 3 y puede decidir cualquier caso.
                      </p>
                      <Nota tipo="ojo">
                        Ni el administrador puede escribir en una fase cerrada:
                        es una garantía de integridad, no un error.
                      </Nota>
                    </Seccion>
                  </Capitulo>

                  {/* 06 · Preguntas frecuentes */}
                  <Capitulo id="faq" n={6} rol={ROLES[5]}>
                    <Seccion titulo="Preguntas frecuentes">
                      <div className="flex flex-col gap-4">
                        {[
                          [
                            "No me llega el correo de acceso",
                            "Revisa spam y promociones. Si no aparece, entra a «¿Olvidaste tu contraseña?», escribe tu correo y pide otro. Si sigue sin llegar, la administración puede generarte un enlace directo.",
                          ],
                          [
                            "El enlace dice que venció",
                            "Los enlaces caducan y se usan una sola vez. Pide uno nuevo desde «¿Olvidaste tu contraseña?».",
                          ],
                          [
                            "Entré pero no veo nada",
                            "Tu cuenta aún no tiene rol. Avisa a la administración para que te lo asigne.",
                          ],
                          [
                            "No puedo guardar una evaluación",
                            "Puede que la fase esté cerrada o pendiente (mira la tarjeta de fase) o que falte la descripción de algún criterio. El mensaje te dice cuál.",
                          ],
                          [
                            "¿Por qué una persona está «En espera»?",
                            "Su puntaje final necesita los tres cortes. Mientras falte uno, se muestra «En espera», nunca un número bajo.",
                          ],
                          [
                            "Una nota N/A, ¿baja el puntaje?",
                            "No. El criterio N/A sale del cálculo y el resto se reescala sobre 100.",
                          ],
                          [
                            "Elegí mal una recomendación o una decisión",
                            "Las recomendaciones se pueden editar mientras no tengan decisión. Una decisión no se edita: pídele a la administración que revise el caso.",
                          ],
                          [
                            "Vi una pantalla de «Estamos mejorando el sitio»",
                            "Es el modo mantenimiento. Espera unos momentos sin cerrar la página: se actualiza sola.",
                          ],
                          [
                            "¿Quién ve las respuestas de un formulario?",
                            "Quien lo creó, la Subsecretaría, la Secretaría General y la administración. Quien responde no necesita cuenta y no queda registrado su dispositivo.",
                          ],
                        ].map(([q, a]) => (
                          <details
                            key={q}
                            className="group rounded-2xl border border-line bg-surface-2 p-4 dark:bg-white/[0.05]"
                            open
                          >
                            <summary className="cursor-pointer list-none font-extrabold text-ink">
                              {q}
                            </summary>
                            <p className="mt-2">{a}</p>
                          </details>
                        ))}
                      </div>
                    </Seccion>
                  </Capitulo>

                  <footer className="relative isolate overflow-hidden rounded-[32px] rounded-tr-[8px] bg-grad-noche p-8 text-center text-white">
                    <CieloEstrellado
                      densidad={1.2}
                      className="-z-10 print:hidden"
                    />
                    <Marca
                      tipo="estrellas"
                      blanco
                      className="mx-auto h-12 w-auto"
                    />
                    <p className="mt-4 text-white/80">
                      Sistema de Evaluación y Control · Modelo Internacional de
                      las Naciones Unidas del Ministerio de Educación
                    </p>
                    <Link
                      to="/"
                      className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-5 font-bold text-[#0043c5] print:hidden"
                    >
                      Ir al sistema
                    </Link>
                  </footer>
                </main>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
