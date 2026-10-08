# Sistema de Evaluación y Control · MINUME XVII

Sistema de evaluación del desempeño de los voluntarios (mesas directivas y miembros de EyC) de MINUME XVII.
Sustituye por completo a la v1 (`oscar-jk/sistema-eyc-minumexvii`).

- **Frontend:** Vite + React 19 + TypeScript + Tailwind 4 + React Query + React Router.
- **Backend:** Supabase (Postgres 17, Auth, RLS, Edge Function). Proyecto `hnlhhwululasvlckbcrq` (us-east-2).
- **Despliegue:** Vercel (sitio estático, SPA).

Documentación:

| Documento | Contenido |
|---|---|
| [ARQUITECTURA.md](ARQUITECTURA.md) | Modelo de datos, reglas de cálculo y decisiones tomadas |
| [SEGURIDAD.md](SEGURIDAD.md) | Matriz de permisos por rol y por fase |
| [GUIA-INICIO.md](GUIA-INICIO.md) | Una página: cargar personas y abrir la primera fase |
| [docs/Manual-de-usuario-EyC-MINUME-XVII.pdf](docs/Manual-de-usuario-EyC-MINUME-XVII.pdf) | Manual de usuario por rol (EyC, Subsecretaría, Secretaría General, Admin). También en la app: `/manual` |
| [docs/Presentacion-EyC-MINUME-XVII.mp4](docs/Presentacion-EyC-MINUME-XVII.mp4) | Video de presentación (33 s, 1080p, con música original sincronizada; se regenera con `python presentacion-video/audio/componer.py`). Fuente editable en [`presentacion-video/`](presentacion-video) (HyperFrames): `npx hyperframes preview` para editar, `npx hyperframes render` para regenerar |

## Arranque local

Requisitos: Node 22 o superior.

```bash
npm install
cp .env.example .env.local   # y completa la llave publicable
npm run dev                  # http://localhost:5173
```

### Variables de entorno

| Variable | Dónde se obtiene | Notas |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API | `https://hnlhhwululasvlckbcrq.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys | Llave **publicable** (`sb_publishable_…`). |

**Nunca** pongas la llave de servicio (`service_role` / `sb_secret_…`) en variables `VITE_*`: todo lo `VITE_*` termina en el navegador.
La única pieza que usa la llave de servicio es la Edge Function `admin-usuarios`, que la recibe del entorno de Supabase.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Verificación de tipos y build de producción en `dist/` |
| `npm run lint` | ESLint (incluye la regla de que ningún componente importe el cliente de Supabase) |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` | Pruebas de interfaz (Vitest) |
| `npm run types` | Regenera `src/lib/database.types.ts` desde el esquema (requiere Supabase CLI con sesión) |

## Base de datos

Las migraciones versionadas están en [`supabase/migrations/`](supabase/migrations) y se aplican en orden:

| # | Migración | Contenido |
|---|---|---|
| 001 | `limpieza` | Elimina el esquema de la v1 y el esquema exploratorio `sirio` |
| 002 | `catalogos` | Tipos, catálogos configurables y datos semilla |
| 003 | `identidad` | Perfiles, personas, asignaciones y alta automática de perfil |
| 004 | `evaluacion` | Actividades, evaluaciones, respuestas, bloqueo por fase y validación de completitud |
| 005 | `calculo` | Puntaje por evaluación, por corte, semáforo y puntaje final (vistas) |
| 006 | `continuidad` | Recomendación, decisión, sustitución, rotación, cobertura y auditoría |
| 007 | `rls` | RLS en todas las tablas y `anon` sin acceso |
| 008 | `endurecimiento` | RPC sensibles en el esquema interno `app`; políticas por comando |
| 009 | `keepalive` | Función mínima para el workflow anti-pausa |
| 010 | `vistas_ui` | Vistas y RPC de apoyo a la interfaz |
| 011 | `edicion_catalogos` | Dimensiones editables por Subsecretaría y admin, con auditoría |
| 012 | `cuentas_admin` | Estado de activación de cada cuenta (el correo se bloquea al activarse) |

Para aplicarlas en otro proyecto: `supabase link --project-ref <ref>` y `supabase db push`.

### Pruebas de reglas (base de datos)

[`supabase/tests/reglas.sql`](supabase/tests/reglas.sql) prueba con **usuarios reales de prueba** (uno por rol) las reglas que no pueden fallar: renormalización con N/O, comentario obligatorio según la respuesta favorable, promedio por corte, puntaje final nulo si falta un corte, RLS por rol, `anon` sin acceso, rotación sin pérdida de historial, elevación al Secretario General, pesos inválidos que bloquean el cálculo, fase cerrada que bloquea a cualquier rol y auditoría.

Se ejecuta completa dentro de un bloque que termina con una excepción controlada, así que **no deja rastro**. Pégala en el SQL Editor de Supabase. El resultado esperado es este error:

```
ERROR: TODAS_LAS_PRUEBAS_OK (11)
```

Cualquier otro mensaje (`FALLO n …`) indica la regla que no se cumplió.

## Despliegue (Vercel)

El proyecto es un sitio estático. En Vercel:

1. Framework: **Vite**. Build: `npm run build`. Salida: `dist`.
2. Variables de entorno (Production y Preview): `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. `vercel.json` ya define el *rewrite* de la SPA y cabeceras de seguridad.

Después del primer despliegue, en **Supabase → Authentication → URL Configuration**:

- **Site URL:** la URL de producción de Vercel.
- **Redirect URLs:** `https://<tu-dominio>/nueva-contrasena` (y `http://localhost:5173/nueva-contrasena` para desarrollo).

Sin esto, los enlaces de recuperación de contraseña redirigen a `localhost`.

### Correo

El SMTP por defecto de Supabase solo envía a los miembros del equipo del proyecto y tiene un límite muy bajo. Hay dos opciones:

- **Sin SMTP (funciona hoy):** el admin crea cada cuenta desde *Configuración → Cuentas* y la app le entrega un **enlace de acceso** para enviarlo por un canal privado (WhatsApp, correo propio). Con ese enlace la persona define su contraseña.
- **Con SMTP propio (recomendado antes del evento):** configura un proveedor (por ejemplo Resend) en *Authentication → SMTP Settings* para que «¿Olvidaste tu contraseña?» llegue por correo a cualquier persona.

## Workflows de GitHub

- `.github/workflows/ci.yml`: lint, tipos, pruebas, build y verificación de que no haya llave de servicio en el bundle.
- `.github/workflows/keepalive.yml`: cada 3 días llama a `rpc/keepalive` para que el plan gratuito no pause el proyecto, y se reactiva solo para que GitHub no lo apague tras 60 días sin commits.

## Errores y soporte

La interfaz nunca muestra errores técnicos: cada fallo se traduce a un mensaje claro con un **código de referencia**
(`EYC-RED`, `EYC-SESION`, `EYC-FASE`, `EYC-PERM-42501`, `EYC-DUP-23505`, `EYC-SOLAPE`, `EYC-X-…`).
El detalle técnico queda en la consola del navegador con ese mismo código. Ver `src/lib/errores.ts`.

Los avisos de la interfaz llevan un botón que abre la pantalla donde se resuelven (por ejemplo, «Abrir o cambiar la fase»
lleva a *Configuración › Fases*; «Corregir los pesos» a *Configuración › Pesos A–F*).

## Plantilla de correo

`supabase/templates/recuperacion.html`: pégala en *Authentication → Emails → Templates → Reset Password*
(asunto: «Define tu contraseña · EyC MINUME XVII»).

## Pruebas de punta a punta

`tests/e2e/flujos.mjs`: 25 flujos por rol en el navegador real. Ver `tests/e2e/LEEME.md`.
