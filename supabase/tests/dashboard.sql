-- Pruebas del dashboard de monitoreo. Termina en una excepción controlada que revierte todo.
-- Resultado esperado: ERROR "DASHBOARD_OK (n)".
do $$
declare
  u_sub uuid := '00000000-0000-0000-0000-0000000000d1';
  u_eyc uuid := '00000000-0000-0000-0000-0000000000d2';
  hoy date := app.hoy();
  c_ctd smallint; c_pnud smallint; k_dir smallint; k_adj smallint; f_prep smallint; corte1 integer;
  p1 uuid; p2 uuid; p3 uuid; act uuid; ev uuid; r jsonb; ok boolean; pruebas int := 0; n int; v numeric;
begin
  select id into c_ctd from public.comisiones where clave = 'ctd';
  select id into c_pnud from public.comisiones where clave = 'pnud';
  select id into k_dir from public.cargos where clave = 'director';
  select id into k_adj from public.cargos where clave = 'adjunto1';
  select id into f_prep from public.fases where clave = 'preparacion';
  select id into corte1 from public.cortes where clave = 'c1';
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (u_sub, 'd-sub@prueba.test', '{"rol":"subsecretario"}', '{"nombre":"Sub"}'),
    (u_eyc, 'd-eyc@prueba.test', jsonb_build_object('rol', 'eyc', 'comision_id', c_ctd), '{"nombre":"EyC"}');
  update public.fases set estado = 'abierta';
  insert into public.personas (nombre, ambito) values ('Persona Uno', 'mesa') returning id into p1;
  insert into public.personas (nombre, ambito) values ('Persona Dos', 'mesa') returning id into p2;
  insert into public.personas (nombre, ambito) values ('Persona Tres', 'mesa') returning id into p3;
  insert into public.asignaciones (persona_id, comision_id, cargo_id, desde, motivo) values
    (p1, c_ctd, k_dir, now() - interval '60 days', 'inicial'),
    (p2, c_ctd, k_adj, now() - interval '60 days', 'inicial'),
    (p3, c_pnud, k_dir, now() - interval '60 days', 'inicial');
  insert into public.actividades (fase_id, comision_id, tipo, nombre, fecha) values (f_prep, c_ctd, 'taller', 'Taller 1', hoy - 5) returning id into act;
  -- P1 al 80 % y P2 al 100 % en cada criterio; P3 sin evaluar.
  perform set_config('request.jwt.claims', json_build_object('sub', u_sub, 'role', 'authenticated')::text, true);
  ev := public.guardar_evaluacion(jsonb_build_object('persona_id', p1, 'actividad_id', act, 'estado', 'completa',
    'respuestas', (select jsonb_agg(jsonb_build_object('criterio_id', c.id, 'respuesta', 'si', 'nota', c.nota_max * 0.8, 'comentario', 'Bien')) from public.criterios c where c.ambito = 'mesa')));
  ev := public.guardar_evaluacion(jsonb_build_object('persona_id', p2, 'actividad_id', act, 'estado', 'completa',
    'respuestas', (select jsonb_agg(jsonb_build_object('criterio_id', c.id, 'respuesta', 'si', 'nota', c.nota_max, 'comentario', 'Excelente')) from public.criterios c where c.ambito = 'mesa')));

  -- 1. Resumen y distribución (la Subse ve todo).
  set local role authenticated;
  r := public.dashboard_monitoreo(corte1, 'mesa');
  if (r -> 'resumen' ->> 'personas')::int <> 3 or (r -> 'resumen' ->> 'evaluadas')::int <> 2 then raise exception 'FALLO 1a: resumen = %', r -> 'resumen'; end if;
  if (r -> 'resumen' ->> 'promedio')::numeric <> 90.00 or (r -> 'resumen' ->> 'minimo')::numeric <> 80.00 or (r -> 'resumen' ->> 'maximo')::numeric <> 100.00 then raise exception 'FALLO 1b: promedio/min/max = %', r -> 'resumen'; end if;
  if (r -> 'resumen' ->> 'verde')::int <> 2 or (r -> 'resumen' ->> 'gris')::int <> 1 or (r -> 'resumen' ->> 'evaluaciones_completas')::int <> 2 then raise exception 'FALLO 1c: semáforo = %', r -> 'resumen'; end if;
  select (b ->> 'n')::int into n from jsonb_array_elements(r -> 'distribucion') b where (b ->> 'desde')::int = 80;
  if n <> 1 then raise exception 'FALLO 1d: el tramo 80–90 debería tener 1 (%)', n; end if;
  select (b ->> 'n')::int into n from jsonb_array_elements(r -> 'distribucion') b where (b ->> 'desde')::int = 90;
  if n <> 1 then raise exception 'FALLO 1e: el tramo 90–100 incluye el 100 (%)', n; end if;
  pruebas := pruebas + 1;

  -- 2. Por comisión, por cargo, por dimensión, tendencia y extremos.
  select (x ->> 'promedio')::numeric into v from jsonb_array_elements(r -> 'por_comision') x where x ->> 'sigla' = 'CTD';
  if v is distinct from 90.00 then raise exception 'FALLO 2a: promedio CTD = %', v; end if;
  select (x ->> 'evaluadas')::int into n from jsonb_array_elements(r -> 'por_comision') x where x ->> 'sigla' = 'PNUD';
  if n <> 0 then raise exception 'FALLO 2b: PNUD no tiene evaluadas (%)', n; end if;
  if jsonb_array_length(r -> 'por_dimension') <> 9 then raise exception 'FALLO 2c: dimensiones = %', jsonb_array_length(r -> 'por_dimension'); end if;
  if exists (select 1 from jsonb_array_elements(r -> 'por_dimension') d where (d ->> 'promedio')::numeric <> 90.00) then raise exception 'FALLO 2d: cada criterio debería promediar 90 (%)', r -> 'por_dimension'; end if;
  if jsonb_array_length(r -> 'tendencia') <> 1 or (r -> 'tendencia' -> 0 ->> 'promedio')::numeric <> 90.00 then raise exception 'FALLO 2e: tendencia = %', r -> 'tendencia'; end if;
  if r -> 'mejores' -> 0 ->> 'nombre' <> 'Persona Dos' or r -> 'atencion' -> 0 ->> 'nombre' <> 'Persona Uno' then raise exception 'FALLO 2f: extremos = % / %', r -> 'mejores', r -> 'atencion'; end if;
  if jsonb_array_length(r -> 'por_cargo') <> 2 then raise exception 'FALLO 2g: cargos = %', r -> 'por_cargo'; end if;
  pruebas := pruebas + 1;

  -- 3. Sin datos en el corte: ceros y listas vacías, no errores.
  r := public.dashboard_monitoreo(-1, null);
  if (r -> 'resumen' ->> 'personas')::int <> 0 or jsonb_array_length(r -> 'mejores') <> 0 or jsonb_array_length(r -> 'por_comision') <> 0 then raise exception 'FALLO 3: corte vacío = %', r; end if;
  pruebas := pruebas + 1;
  reset role;

  -- 4. Permisos: anon no puede ejecutarla y EyC solo ve lo que su RLS le permite (no a toda la mesa).
  set local role anon;
  ok := false; begin perform public.dashboard_monitoreo(corte1, null); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALLO 4a: anon ejecuta el dashboard'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_eyc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.dashboard_monitoreo(corte1, 'mesa');
  if (r -> 'resumen' ->> 'personas')::int > 2 then raise exception 'FALLO 4b: EyC de CTD ve % personas (máximo 2)', r -> 'resumen' ->> 'personas'; end if;
  reset role;
  pruebas := pruebas + 1;

  raise exception 'DASHBOARD_OK (%)', pruebas;
end $$;
