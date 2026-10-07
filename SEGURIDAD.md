# Seguridad

## Principios

- **RLS activa en todas las tablas** de `public`. El rol `anon` no tiene ningún privilegio sobre tablas, vistas ni funciones. La única excepción es `keepalive()`, que devuelve la hora del servidor y no lee nada.
- **Una cuenta por persona** (Supabase Auth). No hay cuentas compartidas: la v1 tenía 17 cuentas por comisión, y se eliminaron.
- **La llave de servicio nunca llega al cliente.** Solo la usa la Edge Function `admin-usuarios`, que antes verifica que quien llama sea admin. El CI comprueba que el bundle no contenga `service_role`.
- **El rol vive en `perfiles`**, que solo un admin puede editar. Al darse de alta, el rol inicial se toma de `app_metadata`, que solo la llave de servicio puede escribir. Si alguien se registra por su cuenta, queda **sin rol y sin acceso**.
- Las funciones auxiliares de rol y comisión (`app.rol()`, `app.comision()`, `app.es()`…) son `security definer` con `search_path` vacío, para no provocar recursión en las políticas.
- Las RPC con privilegios (`decidir`, `registrar_recomendacion`, `mover_asignaciones`, `sustituir`) están en el esquema interno `app`, no expuesto. En `public` solo hay envoltorios `security invoker`. Cada una valida el rol internamente.
- **Auditoría** por trigger en evaluaciones, respuestas, recomendaciones, decisiones, asignaciones, personas, actividades, fases, cortes, pesos, criterios, configuración y perfiles: registra quién, qué, cuándo, los valores anteriores y los nuevos.

## Matriz de permisos por rol

| Recurso | EyC | Subsecretaría | Secretaría General | Admin |
|---|---|---|---|---|
| Catálogos (comisiones, cargos, dimensiones, criterios, cortes, fases, config) | Lee | Lee | Lee | Lee |
| Pesos, umbrales, cortes, fases, criterios, config | — | **Escribe** | — | **Escribe** |
| Comisiones y cargos | — | — | — | **Escribe** |
| Perfiles (cuentas, roles) | Lee nombres | Lee | Lee | **Escribe** (+ Edge Function) |
| Personas | Lee las que pasaron por su comisión | Lee y escribe | Lee | Todo |
| Asignaciones | Lee las de personas que pasaron por su comisión | Escribe vía `mover_asignaciones` | Lee | Escribe vía RPC |
| Actividades | Lee las de su comisión y las generales; crea y cierra las de su comisión | Todo | Lee | Todo |
| Evaluaciones de mesa directiva | Lee las de personas que pasaron por su comisión; **escribe solo sobre asignaciones de su comisión**, como evaluador | Lee | Lee | Todo |
| Evaluaciones de miembros de EyC | — (ni siquiera las propias) | **Escribe** (configurable) | Lee | Todo |
| Editar o borrar una evaluación | Solo las propias; borrar solo borradores | Solo las propias | — | Todo |
| Recomendaciones | Registra sobre la mesa de su comisión | Registra sobre cualquiera | Lee | Todo |
| Decisión continúa o seguimiento (no elevada) | — | **Decide** | — | Decide |
| Decisión elevada (rojo o sustitución) | — | — | **Decide** | Decide |
| Sustitución (tras decisión de sustitución) | — | Sí | Sí | Sí |
| Auditoría | — | Lee | — | Lee |

## Matriz por fase

| Estado de la fase | Evaluaciones, respuestas y actividades del período | Recomendaciones y decisiones del corte | Rotación |
|---|---|---|---|
| **Pendiente** | Bloqueado (trigger) | Bloqueado si ninguna fase del corte está abierta | No |
| **Abierta** | Permitido según el rol | Permitido según el rol | Solo si la fase abierta tiene `permite_rotacion` |
| **Cerrada** | **Bloqueado para todos los roles, incluido admin** | Bloqueado si ninguna fase del corte está abierta | Bloqueado si la fecha cae en una fase cerrada del evento |

Para corregir algo de una fase cerrada hay que reabrirla (Configuración → Fases). La reapertura pide confirmación y queda auditada.

## Verificación

- `supabase/tests/reglas.sql`: pruebas con un usuario real por rol (ver README).
- Llamada externa con la llave publicable: `GET /rest/v1/personas` responde `42501 permission denied`.
- Advisors de Supabase: sin hallazgos de seguridad. La protección contra contraseñas filtradas (HaveIBeenPwned) se activa desde el panel, en *Authentication → Providers → Email*, y requiere el plan Pro.

## Pendientes recomendados en el panel de Supabase

1. **Authentication → Sign In / Providers → desactivar «Allow new users to sign up».** Aunque registrarse no da acceso, evita cuentas basura.
2. **URL Configuration:** Site URL y Redirect URLs de producción (ver README).
3. **SMTP propio**, antes del evento.
