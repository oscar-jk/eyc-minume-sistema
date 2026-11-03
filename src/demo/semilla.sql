-- Datos FICTICIOS de la demostración (se cargan en una base en memoria; no existen en ninguna base real).
-- Todos los nombres son inventados.
set session_replication_role = replica;

-- Usuarios de la demostración: EyC (comisión CTD), Subsecretaría, Secretaría General (autora de las decisiones) y Administración.
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('de000000-0000-4000-8000-00000000e001', 'eyc@demostracion.invalid', '{"rol":"eyc","comision_id":1}', '{"nombre":"Equipo de EyC"}'),
  ('de000000-0000-4000-8000-00000000e002', 'subse@demostracion.invalid', '{"rol":"subsecretario"}', '{"nombre":"Subsecretaría"}'),
  ('de000000-0000-4000-8000-00000000e003', 'sg@demostracion.invalid', '{"rol":"secretario"}', '{"nombre":"Secretaría General"}'),
  ('de000000-0000-4000-8000-00000000e004', 'admin@demostracion.invalid', '{"rol":"admin"}', '{"nombre":"Administración"}');
insert into public.perfiles (id, email, nombre, rol, comision_id, activo) values
  ('de000000-0000-4000-8000-00000000e001', 'eyc@demostracion.invalid', 'Equipo de EyC', 'eyc', 1, true),
  ('de000000-0000-4000-8000-00000000e002', 'subse@demostracion.invalid', 'Subsecretaría', 'subsecretario', null, true),
  ('de000000-0000-4000-8000-00000000e003', 'sg@demostracion.invalid', 'Secretaría General', 'secretario', null, true),
  ('de000000-0000-4000-8000-00000000e004', 'admin@demostracion.invalid', 'Administración', 'admin', null, true)
on conflict (id) do update set rol = excluded.rol, comision_id = excluded.comision_id, nombre = excluded.nombre, activo = true;

-- La fase de preparación abierta: se puede crear actividades y evaluar durante la demostración.
update public.fases set estado = 'abierta' where clave = 'preparacion';

-- 60 personas de mesa (4 por comisión) y 12 integrantes de EyC.
insert into public.personas (id, nombre, ambito, comision_origen_id, cargo_base_id, activa)
select ('de0b1000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
       (array['Valentina','Mateo','Camila','Sebastián','Isabella','Santiago','Daniela','Gabriel','Lucía','Andrés','Natalia','Samuel','Sofía','Diego','Mariana','Nicolás','Paula','Emilio','Renata','Joaquín','Alejandra','Tomás','Carolina','Esteban'])[(i - 1) % 24 + 1]
       || ' ' || (array['Cruz','Ramírez','Soto','Herrera','Mejía','Pérez','Almonte','Castillo','Santana','Medina','Guzmán','Báez','Rivera','Peña','Féliz','Vargas','Rosario','Díaz','Paulino','Tavárez','Ureña','Concepción','Jiménez','Valdez'])[((i - 1) * 7 + 3 + (i - 1) / 24) % 24 + 1]
       || ' ' || (array['Lantigua','Brito','Batista','Cuevas','Hiraldo','Polanco','Sánchez','Reyes','Mota','Custodio','Montero','Lora','Disla','Pimentel','Abreu','Guerrero','Acosta','Frías','Núñez','Santos','Ortiz','Peralta','Rojas','Taveras'])[((i - 1) * 11 + 5 + (i - 1) / 24) % 24 + 1],
       'mesa', (i - 1) / 4 + 1, (i - 1) % 4 + 1, true
from generate_series(1, 60) i;
insert into public.asignaciones (persona_id, comision_id, cargo_id, desde, motivo)
select p.id, p.comision_origen_id, p.cargo_base_id, now() - interval '60 days', 'inicial' from public.personas p where p.ambito = 'mesa';

insert into public.personas (id, nombre, ambito, comision_origen_id, cargo_base_id, correo, activa)
select ('de0b0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, nm, 'eyc', ((n - 1) % 15) + 1, 5, 'eyc' || n || '@demostracion.invalid', true
from unnest(array['Valentina Cruz Peña','Mateo Ramírez Soto','Camila Herrera Díaz','Sebastián Mejía Rosario','Isabella Pérez Féliz','Santiago Almonte Féliz','Daniela Castillo Vargas','Gabriel Santana Rojas','Lucía Medina Paulino','Andrés Guzmán Tavárez','Natalia Báez Ureña','Samuel Rivera Concepción']) with ordinality as t(nm, n);
insert into public.asignaciones (persona_id, comision_id, cargo_id, desde, motivo)
select p.id, p.comision_origen_id, 5, now() - interval '60 days', 'inicial' from public.personas p where p.ambito = 'eyc';

-- Actividades de ejemplo (dos por comisión).
insert into public.actividades (id, fase_id, comision_id, ambito, tipo, nombre, fecha, cerrada, creado_por)
select ('de0a0000-0000-4000-8000-' || lpad((c.id * 2 + k)::text, 12, '0'))::uuid, f.id, c.id, 'mesa',
       (case k when 0 then 'taller' else 'capacitacion' end)::public.tipo_actividad,
       case k when 0 then 'Taller de procedimiento parlamentario' else 'Capacitación de liderazgo' end,
       date '2026-10-20' + k * 3, false, 'de000000-0000-4000-8000-00000000e002'
from public.comisiones c cross join generate_series(0, 1) k cross join (select id from public.fases where clave = 'preparacion') f;

-- Evaluaciones de la mesa: una por persona y una segunda para la mitad; notas según el desempeño (rojo / amarillo / verde).
create temp table _ev as
select row_number() over (order by md5(p.id::text)) rk, p.id persona, a.id asig, a.comision_id comis
from public.personas p join public.asignaciones a on a.persona_id = p.id and a.hasta is null
where p.ambito = 'mesa';
insert into public.evaluaciones (id, persona_id, asignacion_id, actividad_id, fase_id, corte_id, ambito, evaluador_id, estado, comentario_general, creado_en, actualizado_en, completada_en)
select ('de0e' || case v when 0 then '0' else '1' end || '000-0000-4000-8000-' || lpad(e.rk::text, 12, '0'))::uuid, e.persona, e.asig,
       ('de0a0000-0000-4000-8000-' || lpad((e.comis * 2 + v)::text, 12, '0'))::uuid, f.id, 1, 'mesa', 'de000000-0000-4000-8000-00000000e002', 'completa',
       case when e.rk <= 17 then 'Debe reforzar el manejo del reglamento y del tiempo.' when e.rk <= 41 then 'Buen desempeño con aspectos por mejorar.' else 'Excelente conducción de la sesión.' end,
       timestamptz '2026-10-20 15:00-04' + v * interval '3 days', timestamptz '2026-10-20 15:30-04' + v * interval '3 days', timestamptz '2026-10-20 15:30-04' + v * interval '3 days'
from _ev e cross join generate_series(0, 1) v cross join (select id from public.fases where clave = 'preparacion') f
where v = 0 or e.rk % 2 = 0;
insert into public.respuestas (evaluacion_id, criterio_id, respuesta, comentario, dimension_id, favorable, texto, nota, nota_max)
select ev.id, c.id, 'si', 'Criterio ' || c.codigo || ': ' || case when e.rk <= 17 then 'se observaron fallas frecuentes.' when e.rk <= 41 then 'cumple en lo esencial, con detalles por pulir.' else 'desempeño sobresaliente.' end,
       c.dimension_id, c.favorable, c.texto,
       round((c.nota_max * least(1, greatest(0.1, (case when e.rk <= 17 then 0.50 when e.rk <= 41 then 0.70 else 0.90 end) + ((('x' || substr(md5(ev.id::text || c.id::text), 1, 4))::bit(16)::int % 17) - 8) / 100.0))) * 2) / 2, c.nota_max
from public.evaluaciones ev join _ev e on e.persona = ev.persona_id cross join public.criterios c
where ev.id::text like 'de0e%' and c.ambito = 'mesa' and c.activo;
insert into public.evaluacion_dimensiones (evaluacion_id, dimension_id, no_observado)
select ev.id, d.id, false from public.evaluaciones ev cross join public.dimensiones d where ev.id::text like 'de0e%';

-- Evaluaciones directas a integrantes de EyC (7 completas y 2 borradores).
insert into public.evaluaciones (id, persona_id, asignacion_id, fase_id, corte_id, ambito, evaluador_id, estado, comentario_general, creado_en, actualizado_en, completada_en)
select ('de0f0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, p.id, a.id, f.id, 1, 'eyc', 'de000000-0000-4000-8000-00000000e002',
       case when n <= 7 then 'completa' else 'borrador' end::public.estado_evaluacion,
       case when n <= 7 then 'Cumple con sus responsabilidades y acompaña bien a la mesa.' else null end,
       now() - (n || ' days')::interval, now() - (n || ' days')::interval, case when n <= 7 then now() - (n || ' days')::interval end
from generate_series(1, 9) n
join public.personas p on p.id = ('de0b0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
join public.asignaciones a on a.persona_id = p.id
cross join (select id from public.fases where clave = 'preparacion') f;
insert into public.respuestas (evaluacion_id, criterio_id, respuesta, comentario, dimension_id, favorable, texto)
select ev.id, c.id,
       case when (('x' || substr(md5(ev.id::text || c.id::text), 1, 2))::bit(8)::int % 9) = 0 then (case c.favorable when 'si' then 'no' else 'si' end)::public.respuesta_criterio else c.favorable end,
       case when (('x' || substr(md5(ev.id::text || c.id::text), 1, 2))::bit(8)::int % 9) = 0 then 'Se observó una oportunidad de mejora en este punto.' else null end,
       c.dimension_id, c.favorable, c.texto
from public.evaluaciones ev cross join public.criterios c
where ev.id::text like 'de0f%' and c.ambito = 'eyc' and c.activo;
insert into public.evaluacion_dimensiones (evaluacion_id, dimension_id, no_observado)
select ev.id, d.id, false from public.evaluaciones ev cross join public.dimensiones d where ev.id::text like 'de0f%';

-- Calificación inicial de ejemplo.
insert into public.calificacion_inicial (persona_id, examen, pares, actualizado_por)
select e.persona, 60 + (rk * 7) % 40, 65 + (rk * 11) % 35, 'de000000-0000-4000-8000-00000000e002' from _ev e where e.rk <= 30;

-- Recomendaciones y decisiones de ejemplo sobre lo calculado.
insert into public.recomendaciones (id, persona_id, corte_id, recomendacion, comentario, puntaje_registrado, semaforo_registrado, n_evaluaciones, autor_id)
select ('de0c0000-0000-4000-8000-' || lpad(row_number() over (order by pc.puntaje)::text, 12, '0'))::uuid, pc.persona_id, 1,
       (case when row_number() over (order by pc.puntaje) <= 4 then 'sustitucion' else 'seguimiento' end)::public.estatus_continuidad,
       case when row_number() over (order by pc.puntaje) <= 4 then 'Desempeño muy por debajo de lo esperado en el corte; se recomienda sustitución.' else 'Se recomienda seguimiento cercano en el siguiente corte.' end,
       pc.puntaje, pc.semaforo, pc.n_evaluaciones, 'de000000-0000-4000-8000-00000000e002'
from public.v_puntaje_corte pc
where pc.corte_id = 1 and pc.ambito = 'mesa' and pc.semaforo in ('rojo', 'amarillo') and pc.puntaje is not null and pc.puntaje < 66;
insert into public.decisiones (id, recomendacion_id, persona_id, corte_id, decision, comentario, elevada, autor_id)
select ('de0d0000-0000-4000-8000-' || lpad(row_number() over (order by r.id)::text, 12, '0'))::uuid, r.id, r.persona_id, 1,
       (case when row_number() over (order by r.id) = 1 then 'sustitucion' else 'seguimiento' end)::public.estatus_continuidad,
       'Decisión de ejemplo.', true, 'de000000-0000-4000-8000-00000000e003'
from public.recomendaciones r where r.id::text like 'de0c%' and r.recomendacion = 'sustitucion' limit 2;

drop table _ev;
set session_replication_role = origin;
