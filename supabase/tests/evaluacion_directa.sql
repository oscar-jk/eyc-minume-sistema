-- Pruebas de la evaluación directa a integrantes de EyC (migración 023). Termina en una excepción controlada que revierte todo.
-- Resultado esperado: ERROR "DIRECTA_OK (n)".
do $$
declare
  u_sub uuid := '00000000-0000-0000-0000-0000000000e1';
  u_sec uuid := '00000000-0000-0000-0000-0000000000e2';
  pe uuid; pm uuid; ev uuid; r record; n int; pruebas int := 0; fallo boolean;
begin
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (u_sub, 'e-sub@prueba.test', '{"rol":"subsecretario"}', '{"nombre":"Sub"}'),
    (u_sec, 'e-sec@prueba.test', '{"rol":"secretario"}', '{"nombre":"Sec"}');
  insert into public.personas (nombre, ambito) values ('Integrante EyC', 'eyc') returning id into pe;
  insert into public.personas (nombre, ambito) values ('Miembro Mesa', 'mesa') returning id into pm;
  update public.fases set estado = 'cerrada';

  perform set_config('request.jwt.claims', json_build_object('sub', u_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. Sin fase de evaluación abierta no se puede evaluar.
  fallo := false;
  begin
    perform public.guardar_evaluacion(jsonb_build_object('persona_id', pe, 'estado', 'borrador', 'respuestas', '[]'::jsonb));
  exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO 1: debió exigir una fase abierta'; end if;
  pruebas := pruebas + 1;

  -- 2. Con una fase de evaluación abierta se registra sin actividad ni jornada, con su corte.
  reset role;
  update public.fases set estado = 'abierta' where clave = (select clave from public.fases where tipo = 'evaluacion' order by orden limit 1);
  perform set_config('request.jwt.claims', json_build_object('sub', u_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  ev := public.guardar_evaluacion(jsonb_build_object('persona_id', pe, 'estado', 'completa', 'comentario_general', 'Buen trabajo',
    'respuestas', (select jsonb_agg(jsonb_build_object('criterio_id', c.id, 'respuesta', c.favorable, 'comentario', 'ok')) from public.criterios c where c.ambito = 'eyc'),
    'dimensiones_no_observadas', '[]'::jsonb));
  select * into r from public.v_evaluaciones where evaluacion_id = ev;
  if r.actividad_id is not null or r.fecha_jornada is not null or r.ambito <> 'eyc' or r.estado <> 'completa' or r.fecha is null or r.corte_id is null then
    raise exception 'FALLO 2a: evaluación directa mal registrada (%)', r;
  end if;
  if r.puntaje is distinct from 100.00 then raise exception 'FALLO 2b: puntaje = % (se esperaba 100)', r.puntaje; end if;
  pruebas := pruebas + 1;

  -- 3. Una sola evaluación directa por persona y corte: se edita, no se duplica.
  fallo := false;
  begin
    perform public.guardar_evaluacion(jsonb_build_object('persona_id', pe, 'estado', 'borrador', 'respuestas', '[]'::jsonb));
  exception when unique_violation then fallo := true; end;
  if not fallo then raise exception 'FALLO 3: debió impedir el duplicado'; end if;
  pruebas := pruebas + 1;

  -- 4. A un miembro de mesa no se le evalúa sin actividad ni jornada.
  fallo := false;
  begin
    perform public.guardar_evaluacion(jsonb_build_object('persona_id', pm, 'estado', 'borrador', 'respuestas', '[]'::jsonb));
  exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO 4: la mesa exige actividad o jornada'; end if;
  pruebas := pruebas + 1;

  -- 5. Secretaría General (solo lectura) no puede evaluar, pero sí ve la evaluación.
  perform set_config('request.jwt.claims', json_build_object('sub', u_sec, 'role', 'authenticated')::text, true);
  select count(*) into n from public.v_evaluaciones where evaluacion_id = ev;
  if n <> 1 then raise exception 'FALLO 5a: Secretaría debería ver la evaluación'; end if;
  fallo := false;
  begin
    perform public.guardar_evaluacion(jsonb_build_object('persona_id', pe, 'id', ev, 'estado', 'borrador', 'respuestas', '[]'::jsonb));
  exception when others then fallo := true; end;
  if not fallo then raise exception 'FALLO 5b: Secretaría no debería poder editar'; end if;
  pruebas := pruebas + 1;

  raise exception 'DIRECTA_OK (%)', pruebas;
end $$;
