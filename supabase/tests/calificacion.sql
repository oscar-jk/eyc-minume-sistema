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

  -- 3. Feedback: un formulario de delegados (escala 1–5, cuenta) y otro de compañeros, sobre la comisión CTD el Día 1.
  perform set_config('request.jwt.claims', json_build_object('sub', u_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.formularios (titulo, fuente) values ('Feedback delegados', 'delegados') returning id into fdel;
  insert into public.formularios (titulo, fuente) values ('Feedback compañeros', 'companeros') returning id into fcom;
  insert into public.formulario_campos (formulario_id, tipo, etiqueta, escala_min, escala_max, puntua) values (fdel, 'escala', 'Imparcialidad', 1, 5, true) returning id into kdel;
  insert into public.formulario_campos (formulario_id, tipo, etiqueta, escala_min, escala_max, puntua) values (fcom, 'escala', 'Coordinación', 1, 10, true) returning id into kcom;
  insert into public.formulario_campos (formulario_id, tipo, etiqueta, escala_min, escala_max, puntua) values (fdel, 'escala', 'Pregunta que no cuenta', 1, 5, false) returning id into kno;
  ok := false; begin insert into public.formulario_campos (formulario_id, tipo, etiqueta, puntua) values (fdel, 'texto', 'Texto puntuable', true); exception when others then ok := true; end;
  if not ok then raise exception 'FALLO 3a: un campo de texto no debe poder puntuar'; end if;
  reset role;
  -- Envíos del Día 1 (hoy-3) sobre CTD: delegados 5 → 100 y 3 → 50 (promedio 75); compañeros 10 de 10 → 100 y 8 de 10 → 77.78 (promedio 88.89).
  insert into public.formulario_envios (formulario_id, rol, comision_id, referencia, huella, creado_en)
    values (fdel, 'delegado', c_ctd, 'S1', 'h1', ((hoy - 3)::timestamp + interval '15 hours') at time zone app.zona()) returning id into e;
  insert into public.formulario_respuestas values (e, kdel, '5'), (e, kno, '1');
  insert into public.formulario_envios (formulario_id, rol, comision_id, referencia, huella, creado_en)
    values (fdel, 'delegado', c_ctd, 'S1', 'h2', ((hoy - 3)::timestamp + interval '16 hours') at time zone app.zona()) returning id into e;
  insert into public.formulario_respuestas values (e, kdel, '3');
  insert into public.formulario_envios (formulario_id, rol, comision_id, referencia, huella, creado_en)
    values (fcom, 'mesa', c_ctd, 'S1', 'h3', ((hoy - 3)::timestamp + interval '17 hours') at time zone app.zona()) returning id into e;
  insert into public.formulario_respuestas values (e, kcom, '10');
  insert into public.formulario_envios (formulario_id, rol, comision_id, referencia, huella, creado_en)
    values (fcom, 'mesa', c_ctd, 'S1', 'h4', ((hoy - 3)::timestamp + interval '18 hours') at time zone app.zona()) returning id into e;
  insert into public.formulario_respuestas values (e, kcom, '8');
  -- Un envío del mismo día pero sobre PNUD (otra comisión) y uno del propio Día 2 (no cuenta para decidir el Día 2).
  insert into public.formulario_envios (formulario_id, rol, comision_id, referencia, huella, creado_en)
    values (fdel, 'delegado', c_pnud, 'S1', 'h5', ((hoy - 3)::timestamp + interval '15 hours') at time zone app.zona()) returning id into e;
  insert into public.formulario_respuestas values (e, kdel, '1');
  insert into public.formulario_envios (formulario_id, rol, comision_id, referencia, huella, creado_en)
    values (fdel, 'delegado', c_ctd, 'S2', 'h6', ((hoy - 2)::timestamp + interval '10 hours') at time zone app.zona()) returning id into e;
  insert into public.formulario_respuestas values (e, kdel, '1');
  -- Valoración de EyC: P1 evaluado con 100 la jornada del Día 1.
  perform public.guardar_evaluacion(jsonb_build_object('persona_id', p1, 'fecha_jornada', hoy - 3, 'estado', 'completa', 'respuestas', perfecto));

  -- 4. Puntuación para el Día 2 (pesos 50/20/15/15).
  perform set_config('request.jwt.claims', json_build_object('sub', u_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select * into r from public.puntuacion_rotacion(2) where persona_id = p1;
  if r.inicial is distinct from 83.00 or r.delegados is distinct from 75.00 or r.companeros is distinct from 88.89 or r.eyc is distinct from 100.00 then
    raise exception 'FALLO 4a: fuentes de P1 = % / % / % / %', r.inicial, r.delegados, r.companeros, r.eyc;
  end if;
  -- (83·50 + 75·20 + 88.89·15 + 100·15) / 100 = 84.83
  if r.total is distinct from 84.83 or not r.pesos_validos then raise exception 'FALLO 4b: total de P1 = % (esperado 84.83)', r.total; end if;
  -- P2 no tiene calificación inicial ni valoración de EyC: pesa solo lo que existe → (75·20 + 88.89·15) / 35 = 80.95
  select * into r from public.puntuacion_rotacion(2) where persona_id = p2;
  if r.inicial is not null or r.eyc is not null then raise exception 'FALLO 4c: P2 no debería tener inicial ni EyC'; end if;
  if r.total is distinct from 80.95 then raise exception 'FALLO 4d: total de P2 con fuentes faltantes = % (esperado 80.95)', r.total; end if;
  -- P3 (PNUD) solo tiene feedback de delegados de PNUD (1 → 0): total 0, no nulo.
  select * into r from public.puntuacion_rotacion(2) where persona_id = p3;
  if r.delegados is distinct from 0.00 or r.total is distinct from 0.00 then raise exception 'FALLO 4e: P3 delegados=% total=%', r.delegados, r.total; end if;
  pruebas := pruebas + 1;

  -- 5. Para decidir el Día 3 ya cuenta el feedback del Día 2, con otros pesos (30/30/20/20).
  select * into r from public.puntuacion_rotacion(3) where persona_id = p1;
  -- delegados del Día 1 y del Día 2 sobre CTD: (100 + 50 + 0) / 3 = 50 (las respuestas del Día 2: 1 → 0)
  if r.delegados is distinct from 50.00 then raise exception 'FALLO 5a: delegados acumulados de P1 = % (esperado 50)', r.delegados; end if;
  if r.peso_inicial <> 30 or r.peso_eyc <> 20 then raise exception 'FALLO 5b: pesos del Día 3 incorrectos'; end if;
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
