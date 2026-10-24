-- Pruebas de la calificación inicial y de la puntuación para decidir rotaciones.
-- Termina en una excepción controlada que revierte todo. Resultado esperado: ERROR "CALIFICACION_OK (n)".
do $$
declare
  u_sub uuid := '00000000-0000-0000-0000-0000000000c1';
  u_eyc uuid := '00000000-0000-0000-0000-0000000000c2';
  u_sec uuid := '00000000-0000-0000-0000-0000000000c3';
  hoy date := app.hoy();
  c_ctd smallint; c_pnud smallint; k_dir smallint; k_adj smallint; f_prep smallint;
  p1 uuid; p2 uuid; p3 uuid; act uuid; ev uuid; fdel uuid; fcom uuid; kdel uuid; kcom uuid; kno uuid; e uuid;
  n int; ok boolean; v numeric; r record; pruebas int := 0;
  perfecto jsonb;
begin
  select id into c_ctd from public.comisiones where clave = 'ctd';
  select id into c_pnud from public.comisiones where clave = 'pnud';
  select id into k_dir from public.cargos where clave = 'director';
  select id into k_adj from public.cargos where clave = 'adjunto1';
  select id into f_prep from public.fases where clave = 'preparacion';
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (u_sub, 'c-sub@prueba.test', '{"rol":"subsecretario"}', '{"nombre":"Sub"}'),
    (u_eyc, 'c-eyc@prueba.test', jsonb_build_object('rol', 'eyc', 'comision_id', c_ctd), '{"nombre":"EyC"}'),
    (u_sec, 'c-sec@prueba.test', '{"rol":"secretario"}', '{"nombre":"Sec"}');

  update public.fases set estado = 'abierta';
  -- Sesiones que empezaron hace 3 días: Día 1 = hoy-3, Día 2 = hoy-2, Día 3 = hoy-1.
  update public.config set valor = to_jsonb((hoy - 3)::text) where clave = 'sesiones_inicio';
  update public.fases set inicio = hoy - 3, fin = hoy - 2 where clave = 'evento_d1_2';
  update public.fases set inicio = hoy - 2, fin = hoy - 2 where clave = 'corte2';
  update public.fases set inicio = hoy - 1, fin = hoy where clave = 'evento_d3_6';
  update public.fases set inicio = hoy, fin = null where clave = 'cierre';

  insert into public.personas (nombre, ambito) values ('Persona Uno', 'mesa') returning id into p1;
  insert into public.personas (nombre, ambito) values ('Persona Dos', 'mesa') returning id into p2;
  insert into public.personas (nombre, ambito) values ('Persona Tres', 'mesa') returning id into p3;
  insert into public.asignaciones (persona_id, comision_id, cargo_id, desde, motivo) values
    (p1, c_ctd,  k_dir, now() - interval '60 days', 'inicial'),
    (p2, c_ctd,  k_adj, now() - interval '60 days', 'inicial'),
    (p3, c_pnud, k_dir, now() - interval '60 days', 'inicial');

  select jsonb_agg(jsonb_build_object('criterio_id', c.id, 'respuesta', 'si', 'nota', c.nota_max, 'comentario', 'Excelente'))
    into perfecto from public.criterios c where c.ambito = 'mesa';
  -- Evaluación institucional de P1 (Corte 1): 80 → una nota al 80 % en cada criterio.
  insert into public.actividades (fase_id, comision_id, tipo, nombre, fecha) values (f_prep, c_ctd, 'taller', 'Taller 1', hoy - 20) returning id into act;
  ev := public.guardar_evaluacion(jsonb_build_object('persona_id', p1, 'actividad_id', act, 'estado', 'completa',
    'respuestas', (select jsonb_agg(jsonb_build_object('criterio_id', c.id, 'respuesta', 'si', 'nota', c.nota_max * 0.8, 'comentario', 'Bien')) from public.criterios c where c.ambito = 'mesa')));
  select puntaje into v from public.v_evaluacion_puntaje where evaluacion_id = ev;
  if v is distinct from 80.00 then raise exception 'FALLO 0: la evaluación institucional debería dar 80, dio %', v; end if;

  -- 1. La Subse captura examen y pares; el total combina 50/30/20 solo con las tres notas.
  perform set_config('request.jwt.claims', json_build_object('sub', u_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.calificacion_inicial (persona_id, examen, pares) values (p1, 90, 70), (p2, 60, null);
  select total into v from public.v_calificacion_inicial where persona_id = p1;
  if v is distinct from 83.00 then raise exception 'FALLO 1a: calificación inicial de P1 = % (esperado 83)', v; end if;
  select total into v from public.v_calificacion_inicial where persona_id = p2;
  if v is not null then raise exception 'FALLO 1b: con una nota faltante el total debe ser nulo, fue %', v; end if;
  select count(*) into n from public.v_calificacion_inicial; if n <> 3 then raise exception 'FALLO 1c: debe listar a las 3 personas de mesa (%)', n; end if;
  ok := false; begin insert into public.calificacion_inicial (persona_id, examen) values (p3, 120); exception when others then ok := true; end;
  if not ok then raise exception 'FALLO 1d: aceptó un examen de 120'; end if;
  reset role;
  pruebas := pruebas + 1;

  -- 2. Permisos: EyC no lee ni escribe la calificación inicial; la Secretaría General solo lee.
  perform set_config('request.jwt.claims', json_build_object('sub', u_eyc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.calificacion_inicial; if n <> 0 then raise exception 'FALLO 2a: EyC lee la calificación inicial'; end if;
  ok := false; begin insert into public.calificacion_inicial (persona_id, examen) values (p3, 50); exception when others then ok := true; end;
  if not ok then raise exception 'FALLO 2b: EyC escribió una calificación inicial'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_sec, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.calificacion_inicial; if n <> 2 then raise exception 'FALLO 2c: la Secretaría General no la lee (%)', n; end if;
  ok := false; begin insert into public.calificacion_inicial (persona_id, examen) values (p3, 50); exception when others then ok := true; end;
  if not ok then raise exception 'FALLO 2d: la Secretaría General escribió una calificación inicial'; end if;
  reset role;
  pruebas := pruebas + 1;

  -- 3. Valoración de EyC: P1 evaluado con 100 la jornada del Día 1 (los formularios de feedback NO puntúan a nadie).
  perform set_config('request.jwt.claims', json_build_object('sub', u_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  ok := false; begin perform 1 from information_schema.columns where table_name = 'formularios' and column_name = 'fuente' and table_schema = 'public'; if found then raise exception 'x'; end if; ok := true; exception when others then ok := false; end;
  if not ok then raise exception 'FALLO 3a: formularios todavía tiene la columna fuente'; end if;
  reset role;
  perform public.guardar_evaluacion(jsonb_build_object('persona_id', p1, 'fecha_jornada', hoy - 3, 'estado', 'completa', 'respuestas', perfecto));

  -- 4. Puntuación para el Día 2 (pesos 70/30): P1 = 83·0.7 + 100·0.3 = 88.10
  perform set_config('request.jwt.claims', json_build_object('sub', u_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select * into r from public.puntuacion_rotacion(2) where persona_id = p1;
  if r.inicial is distinct from 83.00 or r.eyc is distinct from 100.00 then raise exception 'FALLO 4a: fuentes de P1 = % / %', r.inicial, r.eyc; end if;
  if r.total is distinct from 88.10 or not r.pesos_validos then raise exception 'FALLO 4b: total de P1 = % (esperado 88.10)', r.total; end if;
  -- P2 no tiene calificación inicial completa ni valoración de EyC: sin datos, sin total.
  select * into r from public.puntuacion_rotacion(2) where persona_id = p2;
  if r.inicial is not null or r.eyc is not null or r.total is not null then raise exception 'FALLO 4c: P2 debería quedar sin datos (% / % / %)', r.inicial, r.eyc, r.total; end if;
  pruebas := pruebas + 1;

  -- 5. Día 3: otros pesos (40/60) → 83·0.4 + 100·0.6 = 93.20
  select * into r from public.puntuacion_rotacion(3) where persona_id = p1;
  if r.peso_inicial <> 40 or r.peso_eyc <> 60 then raise exception 'FALLO 5a: pesos del Día 3 incorrectos'; end if;
  if r.total is distinct from 93.20 then raise exception 'FALLO 5b: total de P1 el Día 3 = % (esperado 93.20)', r.total; end if;
  ok := false; begin perform * from public.puntuacion_rotacion(1); exception when others then ok := sqlerrm like '%Día 2%'; end;
  if not ok then raise exception 'FALLO 5c: aceptó el Día 1'; end if;
  reset role;
  pruebas := pruebas + 1;

  -- 6. Si los pesos de un día no suman 100, la puntuación se bloquea (no calcula a medias).
  update public.config set valor = jsonb_set(valor, '{2,inicial}', '40') where clave = 'ponderacion_rotacion';
  perform set_config('request.jwt.claims', json_build_object('sub', u_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select * into r from public.puntuacion_rotacion(2) where persona_id = p1;
  if r.total is not null or r.pesos_validos then raise exception 'FALLO 6: con pesos inválidos se calculó %', r.total; end if;
  reset role;
  pruebas := pruebas + 1;

  -- 7. anon no ve nada de esto.
  set local role anon;
  ok := false; begin perform 1 from public.v_calificacion_inicial; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALLO 7a: anon lee la calificación inicial'; end if;
  ok := false; begin perform * from public.puntuacion_rotacion(2); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALLO 7b: anon ejecuta la puntuación'; end if;
  reset role;
  pruebas := pruebas + 1;

  raise exception 'CALIFICACION_OK (%)', pruebas;
end $$;
