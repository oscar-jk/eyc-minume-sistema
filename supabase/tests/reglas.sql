-- Pruebas de las reglas que no pueden fallar.
-- Se ejecuta completa dentro de un bloque que termina en una excepción controlada:
-- todo lo creado se revierte. Resultado esperado: ERROR "TODAS_LAS_PRUEBAS_OK (n)".
-- Cualquier otro error indica la prueba que falló.
do $$
declare
  u_admin uuid := '00000000-0000-0000-0000-0000000000a1';
  u_sub   uuid := '00000000-0000-0000-0000-0000000000a2';
  u_sec   uuid := '00000000-0000-0000-0000-0000000000a3';
  u_ctd   uuid := '00000000-0000-0000-0000-0000000000a4';
  u_pnud  uuid := '00000000-0000-0000-0000-0000000000a5';
  p1 uuid; p2 uuid; p3 uuid; pe uuid;
  c_ctd smallint; c_pnud smallint; k_dir smallint; k_adj smallint;
  f_prep smallint; act1 uuid; act2 uuid; ev uuid; rec uuid; nueva uuid;
  hoy date := app.hoy();
  v numeric; n int; b boolean; ok boolean; s text; pruebas int := 0;
  resp_todo_si jsonb;
begin
  -- ───────── Preparación (como postgres) ─────────
  select id into c_ctd from public.comisiones where clave = 'ctd';
  select id into c_pnud from public.comisiones where clave = 'pnud';
  select id into k_dir from public.cargos where clave = 'director';
  select id into k_adj from public.cargos where clave = 'adjunto1';
  select id into f_prep from public.fases where clave = 'preparacion';

  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (u_admin, 't-admin@prueba.test', '{"rol":"admin"}', '{"nombre":"Admin"}'),
    (u_sub,   't-sub@prueba.test',   '{"rol":"subsecretario"}', '{"nombre":"Sub"}'),
    (u_sec,   't-sec@prueba.test',   '{"rol":"secretario"}', '{"nombre":"Sec"}'),
    (u_ctd,   't-ctd@prueba.test',   jsonb_build_object('rol','eyc','comision_id',c_ctd), '{"nombre":"EyC CTD"}'),
    (u_pnud,  't-pnud@prueba.test',  jsonb_build_object('rol','eyc','comision_id',c_pnud), '{"nombre":"EyC PNUD"}');
  if (select count(*) from public.perfiles where email like 't-%@prueba.test' and rol is not null) <> 5 then
    raise exception 'FALLO setup: el trigger de alta no creó los 5 perfiles con rol';
  end if;

  update public.fases set estado = 'abierta';
  update public.fases set inicio = hoy - 5, fin = hoy - 4 where clave = 'evento_d1_2';
  update public.fases set inicio = hoy - 4, fin = hoy - 4 where clave = 'corte2';
  update public.fases set inicio = hoy - 3, fin = hoy     where clave = 'evento_d3_6';
  update public.fases set inicio = hoy,     fin = null    where clave = 'cierre';

  insert into public.personas (nombre, ambito) values ('Persona Uno', 'mesa') returning id into p1;
  insert into public.personas (nombre, ambito) values ('Persona Dos', 'mesa') returning id into p2;
  insert into public.personas (nombre, ambito) values ('Persona Tres', 'mesa') returning id into p3;
  insert into public.personas (nombre, ambito) values ('Evaluador Uno', 'eyc') returning id into pe;
  insert into public.asignaciones (persona_id, comision_id, cargo_id, desde, motivo) values
    (p1, c_ctd,  k_dir, now() - interval '30 days', 'inicial'),
    (p2, c_ctd,  k_adj, now() - interval '30 days', 'inicial'),
    (p3, c_pnud, k_dir, now() - interval '30 days', 'inicial');

  select jsonb_agg(jsonb_build_object('criterio_id', c.id, 'respuesta', c.favorable::text, 'comentario', null))
    into resp_todo_si from public.criterios c where c.ambito = 'mesa';

  -- ───────── EyC de CTD evalúa ─────────
  perform set_config('request.jwt.claims', json_build_object('sub', u_ctd, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.actividades (fase_id, comision_id, tipo, nombre, fecha) values (f_prep, c_ctd, 'taller', 'Taller 1', hoy - 10) returning id into act1;
  insert into public.actividades (fase_id, comision_id, tipo, nombre, fecha) values (f_prep, c_ctd, 'taller', 'Taller 2', hoy - 9) returning id into act2;

  -- 1. Renormalización con N/O: C–F no observadas; A = 100, B = 75 → (100·20 + 75·30) / 50 = 85.
  ev := public.guardar_evaluacion(jsonb_build_object(
    'persona_id', p1, 'actividad_id', act1, 'estado', 'completa',
    'dimensiones_no_observadas', (select jsonb_agg(id) from public.dimensiones where clave in ('C','D','E','F')),
    'respuestas', (select jsonb_agg(jsonb_build_object('criterio_id', c.id,
                     'respuesta', case when c.codigo = 'B4' then 'si' else c.favorable::text end,
                     'comentario', case when c.codigo = 'B4' then 'Errores de redacción en el informe' end))
                   from public.criterios c join public.dimensiones d on d.id = c.dimension_id
                   where c.ambito = 'mesa' and d.clave in ('A','B'))));
  select puntaje into v from public.v_evaluacion_puntaje where evaluacion_id = ev;
  if v is distinct from 85.00 then raise exception 'FALLO 1 renormalización N/O: esperado 85, obtenido %', v; end if;
  pruebas := pruebas + 1;

  -- 2. Comentario obligatorio según la respuesta favorable de cada criterio.
  --    B1 está en negativo (favorable = "no"): responder "no" sin comentario es válido;
  --    responder "si" sin comentario debe bloquear la evaluación completa.
  ok := false;
  begin
    perform public.guardar_evaluacion(jsonb_build_object(
      'persona_id', p1, 'actividad_id', act2, 'estado', 'completa',
      'respuestas', (select jsonb_agg(jsonb_build_object('criterio_id', c.id,
                       'respuesta', case when c.codigo = 'B1' then 'si' else c.favorable::text end))
                     from public.criterios c where c.ambito = 'mesa')));
  exception when others then
    ok := sqlerrm like '%B1: Falta comentario%';
  end;
  if not ok then raise exception 'FALLO 2a: no exigió comentario en respuesta desfavorable de criterio negativo'; end if;
  -- Borrador sí se permite con faltantes.
  ev := public.guardar_evaluacion(jsonb_build_object('persona_id', p1, 'actividad_id', act2, 'estado', 'borrador',
          'respuestas', jsonb_build_array(jsonb_build_object('criterio_id',
             (select id from public.criterios where ambito = 'mesa' and codigo = 'B1'), 'respuesta', 'si'))));
  select count(*) into n from public.faltantes_evaluacion(ev);
  if n < 2 then raise exception 'FALLO 2b: faltantes debería listar criterios sin responder y el comentario de B1 (n=%)', n; end if;
  -- Completar todo favorable (B1 = "no", sin comentario) → válido, 100.
  perform public.guardar_evaluacion(jsonb_build_object('id', ev, 'persona_id', p1, 'estado', 'completa', 'respuestas', resp_todo_si));
  pruebas := pruebas + 1;

  -- 3. Promedio simple por corte: (85 + 100) / 2 = 92.5 con 2 evaluaciones.
  select puntaje, n_evaluaciones into v, n from public.v_puntaje_corte where persona_id = p1 and corte_clave = 'c1';
  if v is distinct from 92.50 or n <> 2 then raise exception 'FALLO 3 promedio por corte: % con n=%', v, n; end if;
  pruebas := pruebas + 1;

  -- 4. Puntaje final nulo mientras falte un corte; corte sin datos = gris, nunca 0.
  select puntaje_final, completo, c2_semaforo::text, c2_puntaje into v, b, s, n
    from public.v_puntaje_final where persona_id = p1;
  if v is not null or b or s <> 'gris' or n is not null then
    raise exception 'FALLO 4 final nulo: final=% completo=% c2=%', v, b, s;
  end if;
  -- Con los tres cortes: 92.5·0.25 + 100·0.25 + 100·0.50 = 98.13
  perform public.guardar_evaluacion(jsonb_build_object('persona_id', p1, 'fecha_jornada', hoy - 5, 'estado', 'completa', 'respuestas', resp_todo_si));
  perform public.guardar_evaluacion(jsonb_build_object('persona_id', p1, 'fecha_jornada', hoy - 3, 'estado', 'completa', 'respuestas', resp_todo_si));
  select puntaje_final into v from public.v_puntaje_final where persona_id = p1;
  if v is distinct from 98.13 then raise exception 'FALLO 4b puntaje final: %', v; end if;
  -- La evaluación final usa solo lo evaluado del 16 al 19 (corte final ≠ cortes previos).
  select n_evaluaciones into n from public.v_puntaje_corte where persona_id = p1 and corte_clave = 'final';
  if n <> 1 then raise exception 'FALLO 4c: la evaluación final cuenta % evaluaciones (esperado 1)', n; end if;
  pruebas := pruebas + 1;

  -- 5. RLS: el EyC de CTD no ve a personas de PNUD ni puede evaluarlas.
  select count(*) into n from public.personas where id = p3;
  if n <> 0 then raise exception 'FALLO 5a RLS: EyC CTD ve a una persona de PNUD'; end if;
  ok := false;
  begin
    perform public.guardar_evaluacion(jsonb_build_object('persona_id', p3, 'fecha_jornada', hoy - 3, 'estado', 'borrador'));
  exception when others then ok := true;
  end;
  if not ok then raise exception 'FALLO 5b RLS: EyC CTD pudo evaluar a una persona de PNUD'; end if;
  -- No puede escribir decisiones ni asignaciones directamente.
  ok := false;
  begin
    insert into public.asignaciones (persona_id, comision_id, cargo_id, motivo) values (p3, c_ctd, k_dir, 'ajuste');
  exception when others then ok := true;
  end;
  if not ok then raise exception 'FALLO 5c RLS: EyC insertó una asignación directamente'; end if;
  pruebas := pruebas + 1;
  reset role;

  -- 6. anon no tiene ningún acceso.
  set local role anon;
  ok := false;
  begin perform 1 from public.personas limit 1; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALLO 6 anon puede leer personas'; end if;
  ok := false;
  begin perform 1 from public.v_puntaje_final limit 1; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALLO 6b anon puede leer vistas de puntaje'; end if;
  reset role;
  pruebas := pruebas + 1;

  -- 7. Rotación sin pérdida de historial: intercambio P1 (CTD) ↔ P3 (PNUD).
  perform set_config('request.jwt.claims', json_build_object('sub', u_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.mover_asignaciones(jsonb_build_array(
    jsonb_build_object('persona_id', p1, 'comision_id', c_pnud, 'cargo_id', k_dir),
    jsonb_build_object('persona_id', p3, 'comision_id', c_ctd,  'cargo_id', k_dir)), 'rotacion');
  select count(*) into n from public.asignaciones where persona_id = p1;
  if n <> 2 then raise exception 'FALLO 7a rotación: P1 tiene % asignaciones (esperado 2)', n; end if;
  select count(*) into n from public.personas where nombre in ('Persona Uno','Persona Tres');
  if n <> 2 then raise exception 'FALLO 7b rotación creó o borró personas'; end if;
  select count(*) into n from public.evaluaciones e join public.asignaciones a on a.id = e.asignacion_id
    where e.persona_id = p1 and a.comision_id = c_ctd;
  if n <> 4 then raise exception 'FALLO 7c: las evaluaciones previas perdieron su asignación de CTD (n=%)', n; end if;
  select comision_id into n from public.v_asignaciones_vigentes where persona_id = p1;
  if n <> c_pnud then raise exception 'FALLO 7d: la asignación vigente de P1 no es PNUD'; end if;
  reset role;
  -- El EyC de CTD conserva el histórico de P1 aunque ya no esté en su comisión.
  perform set_config('request.jwt.claims', json_build_object('sub', u_ctd, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.evaluaciones where persona_id = p1;
  if n <> 4 then raise exception 'FALLO 7e: EyC CTD perdió el histórico de P1 (n=%)', n; end if;
  reset role;
  pruebas := pruebas + 1;

  -- 8. Recomendación → decisión: sustitución se eleva al Secretario General y sustituye en una transacción.
  perform set_config('request.jwt.claims', json_build_object('sub', u_sub, 'role', 'authenticated')::text, true);
  set local role authenticated;
  ok := false;
  begin rec := public.registrar_recomendacion(p2, (select id from public.cortes where clave = 'c1'), 'sustitucion', null);
  exception when others then ok := sqlerrm like '%comentario es obligatorio%'; end;
  if not ok then raise exception 'FALLO 8a: recomendación de sustitución sin comentario fue aceptada'; end if;
  rec := public.registrar_recomendacion(p2, (select id from public.cortes where clave = 'c1'), 'sustitucion', 'No asistió a capacitaciones');
  ok := false;
  begin perform public.decidir(rec, 'sustitucion', 'x');
  exception when others then ok := sqlerrm like '%Secretario General%'; end;
  if not ok then raise exception 'FALLO 8b: la Subsecretaría decidió un caso elevado'; end if;
  ok := false;
  begin perform public.sustituir(p2, '{"nombre":"Persona Nueva"}');
  exception when others then ok := sqlerrm like '%decisión de sustitución%'; end;
  if not ok then raise exception 'FALLO 8c: se pudo sustituir sin decisión'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_sec, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.decidir(rec, 'sustitucion', 'Se confirma la sustitución', '{"nombre":"Persona Nueva"}');
  reset role;
  select estatus::text into s from public.v_continuidad_actual where persona_id = p2;
  if s <> 'sustitucion' then raise exception 'FALLO 8d estatus de continuidad: %', s; end if;
  select p.id into nueva from public.v_asignaciones_vigentes v join public.personas p on p.id = v.persona_id
    where v.comision_id = c_ctd and v.cargo_id = k_adj;
  if nueva is null or nueva = p2 then raise exception 'FALLO 8e: el cargo no quedó ocupado por la persona entrante'; end if;
  if (select activa from public.personas where id = p2) then raise exception 'FALLO 8f: la persona saliente sigue activa'; end if;
  if (select comentario from public.decisiones where recomendacion_id = rec) is null then raise exception 'FALLO 8g: comentario de decisión vacío'; end if;
  pruebas := pruebas + 1;

  -- 9. Pesos que no suman 100 bloquean el cálculo del ámbito (no calculan a medias).
  update public.pesos_dimension set peso = 25
   where ambito = 'mesa' and dimension_id = (select id from public.dimensiones where clave = 'A');
  select puntaje, pesos_validos into v, b from public.v_evaluacion_puntaje where persona_id = p1 limit 1;
  if v is not null or b then raise exception 'FALLO 9: con pesos inválidos se calculó %', v; end if;
  update public.pesos_dimension set peso = 20
   where ambito = 'mesa' and dimension_id = (select id from public.dimensiones where clave = 'A');
  pruebas := pruebas + 1;

  -- 10. Fase cerrada bloquea toda escritura, sin importar el rol (incluido admin).
  update public.fases set estado = 'cerrada' where id = f_prep;
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  ok := false;
  begin
    update public.evaluaciones set comentario_general = 'cambio' where actividad_id = act1;
  exception when others then ok := sqlerrm like '%no se puede escribir%';
  end;
  if not ok then raise exception 'FALLO 10a: admin escribió en una fase cerrada'; end if;
  ok := false;
  begin
    insert into public.actividades (fase_id, comision_id, tipo, nombre, fecha) values (f_prep, c_ctd, 'reunion', 'Tarde', hoy);
  exception when others then ok := sqlerrm like '%no se puede escribir%';
  end;
  if not ok then raise exception 'FALLO 10b: se creó una actividad en fase cerrada'; end if;
  reset role;
  pruebas := pruebas + 1;

  -- 11. Auditoría registra autor y valores anteriores.
  select count(*) into n from public.auditoria where tabla = 'decisiones' and autor = u_sec and accion = 'insert';
  if n <> 1 then raise exception 'FALLO 11: auditoría de decisión no registrada con autor'; end if;
  pruebas := pruebas + 1;

  raise exception 'TODAS_LAS_PRUEBAS_OK (%)', pruebas;
end $$;
