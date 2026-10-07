# Arquitectura

## Principios

1. **El cálculo vive en la base de datos.** Puntaje de evaluación, promedio por corte, semáforo y puntaje final son vistas y funciones de Postgres. El frontend solo muestra lo que lee, así que dos pantallas no pueden mostrar números distintos.
2. **Las reglas se hacen cumplir en la base, no en el navegador.** Fase cerrada, comentario obligatorio, cargo único por comisión y quién decide cada caso se validan con triggers, restricciones y funciones. La interfaz los repite solo como ayuda.
3. **Todo lo configurable está en tablas:** pesos, umbrales, fases, fechas, criterios, método de promedio, zona horaria y evaluador de EyC. Nada de eso está escrito en el código.
4. **Persona ≠ asignación.** La persona es la identidad y la asignación es el período en que ocupa un cargo en una comisión.

## Modelo de datos

```
comisiones ─┐                     dimensiones ── criterios ── criterios_historial
cargos ─────┤                          │
            │                     pesos_dimension (ámbito × dimensión)
personas ── asignaciones (desde, hasta, motivo)
   │              │
   │              └──────────────┐
   └── evaluaciones (persona + asignación + actividad | jornada + fase + corte + evaluador + estado)
          ├── respuestas (criterio, Sí/No/N-O, comentario, instantánea del criterio)
          └── evaluacion_dimensiones (dimensión marcada como no observada)

cortes (peso, umbrales) ── fases (fechas, estado, rotación, tipo)
actividades (fase, comisión opcional, ámbito)

recomendaciones (única por persona y corte) ── decisiones (una por recomendación)
perfiles (cuenta → rol, comisión)          auditoria (quién, qué, cuándo, antes/después)
config (clave → valor)
```

Esquemas:

- `public`: tablas, vistas (todas `security_invoker`, así respetan la RLS) y RPC `security invoker` expuestas a la API.
- `app`: funciones auxiliares y RPC `security definer`. **No** está expuesto por la API REST; solo se llega a él a través de los envoltorios de `public`.

## Reglas de cálculo

### Puntaje de una evaluación (`v_evaluacion_dimension`, `v_evaluacion_puntaje`)

- **Puntos de una dimensión** = % de criterios con respuesta favorable entre los observados (Sí/No).
- Una dimensión es **no observada** si el evaluador la marca así o si todos sus criterios son N/O. En ese caso se excluye.
- **Puntaje** = Σ(puntos × peso) / Σ(peso de las dimensiones observadas). Los pesos del resto se renormalizan, así que N/O **nunca** cuenta como cero.
- Si los pesos de un ámbito no suman 100, `pesos_validos = false` y el puntaje queda **nulo** para todo el ámbito. No se calcula a medias.

Ejemplo: A = 100 y B = 75; C a F no observadas; pesos de mesa A = 20 y B = 30 → (100·20 + 75·30) / 50 = **85**.

### Respuesta favorable

Cada criterio guarda su `favorable` (`si` o `no`). Los criterios redactados en negativo, como «Mostró desconocimiento del procedimiento parlamentario», tienen `favorable = no`. El comentario es obligatorio cuando la respuesta es la contraria a la favorable. N/O nunca lo exige.

Al responder se guarda una **instantánea** del criterio (texto, favorable y dimensión). Editar un criterio crea una versión nueva en `criterios_historial` y no altera evaluaciones ya hechas.

### Puntaje por corte (`v_puntaje_corte`)

- Es el promedio de las evaluaciones **completas** del corte para esa persona, sin importar en qué comisión las obtuvo.
- El método se configura con `config.metodo_promedio`: `simple` (por defecto) o `ponderado_dias` (cada evaluación pesa según los días asignados dentro del período de la fase).
- Siempre se informa `n_evaluaciones`, junto con los borradores.
- Sin evaluaciones completas el puntaje es nulo y el semáforo **gris**, nunca 0.

### Semáforo (`semaforo_para`)

Se calcula por corte con los umbrales de `cortes` (por defecto: verde ≥ 80, amarillo ≥ 60, rojo < 60). La banda 60–69 se resolvió como **seguimiento**, no sustitución, y es editable. Se eliminó el semáforo de promedio global de la v1.

### Puntaje final (`v_puntaje_final`)

`Σ(puntaje del corte × peso del corte) / 100`, con 25 / 25 / 50 por defecto.

- Es **nulo mientras falte cualquier corte**, y la interfaz lo muestra como «En espera».
- La Evaluación Final usa solo las evaluaciones cuyo `corte_id` es `final`, es decir, las de las jornadas 16 a 19. No reprocesa los cortes anteriores.

### Unidad de evaluación

- **Antes del evento:** una evaluación por actividad y persona (índice único).
- **Durante el evento:** una por jornada y persona (índice único). La asignación se toma con `app.asignacion_dominante`: la que estuvo vigente más tiempo ese día, en la zona horaria del evento. Si la persona rotó durante la jornada, queda anotado en `observacion_rotacion`.
- La fase, el corte, la asignación, el ámbito y el evaluador los fija el **trigger**, no el cliente. El cliente no puede atribuir una evaluación a otro corte.

## Asignaciones y rotación

- Restricciones de exclusión (`btree_gist`): una persona no puede tener dos asignaciones que se solapen, y un cargo único no puede tener dos titulares a la vez en la misma comisión.
- Además hay un índice único parcial: un solo cargo abierto por comisión (`hasta is null`).
- `mover_asignaciones(movs[], motivo, desde)`: primero cierra todas las asignaciones involucradas y luego abre las nuevas, **en una transacción**. Así funcionan los intercambios A↔B. La rotación solo se acepta si hay una fase abierta con `permite_rotacion`.
- Rotar nunca crea ni borra personas y el historial se conserva. El EyC sigue viendo el histórico de quien pasó por su comisión.

## Continuidad

1. **Recomendación** (`registrar_recomendacion`): una por persona y corte, editable mientras la fase siga abierta y no haya decisión. Guarda el puntaje, el semáforo y el número de evaluaciones del momento. El comentario es obligatorio en amarillo, en rojo y en toda sustitución.
2. **Decisión** (`decidir`): continúa o seguimiento las cierra la Subsecretaría. **Rojo o sustitución se elevan** al Secretario General. El comentario se persiste: es obligatorio en casos elevados y en seguimiento o sustitución.
3. **Sustitución** (`sustituir`, o dentro de `decidir`): solo procede si la última decisión sobre la persona es «sustitución». Cierra su asignación, crea o usa a la persona entrante en el mismo cargo y deja inactiva a la saliente, todo en una transacción.
4. **Estatus de continuidad** = la última decisión tomada (`v_continuidad_actual`).

## Fases

| Fase | Tipo | Corte | Rotación |
|---|---|---|---|
| Incorporación y preparación | evaluación por actividad | Corte 1 | No |
| Corte 1 | recomendación | Corte 1 | No |
| Evento — Días 1 y 2 | evaluación por jornada | Corte 2 | Sí |
| Corte 2 | recomendación | Corte 2 | Sí |
| Evento — Días 3 al 6 | evaluación por jornada | Final | Sí |
| Cierre y resultados | recomendación | Final | No |

Una fase que no está **abierta** bloquea, por trigger, toda escritura de su período (evaluaciones, respuestas, actividades) para **cualquier rol**. Las recomendaciones y decisiones exigen que alguna fase de su corte esté abierta. `reprogramar_evento(inicio, días)` recalcula las fechas de las fases del evento.

## Frontend

```
src/
  app/          router, layout, guards (rol y fase), tema, momento (fase/día)
  lib/          cliente supabase, tipos generados, formato, errores
  features/<x>/ api.ts (capa de datos con React Query) + pantallas
  components/   primitivas: Boton, Campo, Modal, Semaforo, Estados, Ui, AvisoCambios
  styles/       tokens (claro/oscuro) mapeados a Tailwind
```

- **Ningún componente importa `lib/supabase`.** Lo impone ESLint (`no-restricted-imports`) y solo lo permiten los `api.ts`.
- Toda consulta pasa por `<Consulta>`, que muestra los estados de carga, error con reintento y vacío.
- Las rutas de escritura se envuelven en `SiFaseAbierta`: con la fase cerrada no se renderizan, se muestra un aviso o una vista de solo lectura.
- `AvisoCambios` bloquea la navegación con cambios sin guardar mediante un modal propio, y también al cerrar la pestaña.
- `localStorage` solo guarda el tema.
- Las rutas se cargan de forma diferida: el EyC en el teléfono descarga solo lo que usa.

## Decisiones tomadas (y por qué)

| Decisión | Motivo |
|---|---|
| Criterios sembrados a partir de las competencias del instructivo | La rúbrica de la v1 estaba incompleta (sin dimensión C y con E truncada). Son editables con historial. |
| Pesos A–F sembrados como **provisionales** | El instructivo no los define. La interfaz muestra la advertencia hasta que se confirmen. |
| Evento sembrado del 14 al 19 de **noviembre de 2026**, 6 días | El mes está por confirmar y hay contradicción de 5 vs. 6 días. Se cambia con `reprogramar_evento`. |
| Banda 60–69 = seguimiento | Contradicción del instructivo; se resolvió a favor del seguimiento (editable). |
| El Subsecretario evalúa a los miembros de EyC | El instructivo no les asigna evaluador; se puede cambiar con `config.evaluador_eyc`. |
| Cuentas sin rol al registrarse | Si alguien se registra por su cuenta no ve nada hasta que un admin le asigna un rol. |
| Enlace de acceso generado por el admin | Funciona sin SMTP propio; el admin lo comparte por un canal privado. |
| Las vistas no guardan puntajes en caché | Cambiar pesos o umbrales recalcula todo al instante y de forma coherente (con confirmación en la interfaz). Las recomendaciones conservan el puntaje con el que se registraron. |
