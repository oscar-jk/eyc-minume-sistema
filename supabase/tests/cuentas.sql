-- Estado de las cuentas. Resultado esperado: ERROR "CUENTAS_OK (n)".
do $$
declare
  u_adm uuid := '00000000-0000-0000-0000-0000000000e1';
  u_a uuid := '00000000-0000-0000-0000-0000000000e2';   -- nunca entró
  u_b uuid := '00000000-0000-0000-0000-0000000000e3';   -- entró enseguida (el correo gastó el enlace)
  u_c uuid := '00000000-0000-0000-0000-0000000000e4';   -- entró de verdad
  u_eyc uuid := '00000000-0000-0000-0000-0000000000e5';
  r record; n int; ok boolean;
begin
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, created_at, last_sign_in_at) values
    (u_adm, 'e-adm@prueba.test', '{"rol":"admin"}', '{"nombre":"Adm"}', now() - interval '2 days', now() - interval '1 day'),
    (u_a, 'e-a@prueba.test', '{"rol":"subsecretario"}', '{"nombre":"A"}', now() - interval '1 day', null),
    (u_b, 'e-b@prueba.test', '{"rol":"subsecretario"}', '{"nombre":"B"}', now() - interval '1 day', now() - interval '1 day' + interval '1 minute'),
    (u_c, 'e-c@prueba.test', '{"rol":"subsecretario"}', '{"nombre":"C"}', now() - interval '1 day', now() - interval '1 hour'),
    (u_eyc, 'e-eyc@prueba.test', jsonb_build_object('rol', 'eyc', 'comision_id', (select id from public.comisiones where clave = 'ctd')), '{"nombre":"EyC"}', now(), null);
  update auth.users set recovery_sent_at = now() - interval '20 hours' where id = u_a;

  perform set_config('request.jwt.claims', json_build_object('sub', u_adm, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select * into r from public.cuentas_admin() where id = u_a;
  if r.activada or r.enlace_consumido or r.correo_enviado_en is null then raise exception 'FALLO 1a: cuenta sin acceso mal clasificada: %', r; end if;
  select * into r from public.cuentas_admin() where id = u_b;
  if r.activada or not r.enlace_consumido then raise exception 'FALLO 1b: enlace gastado por el correo mal clasificado: %', r; end if;
  select * into r from public.cuentas_admin() where id = u_c;
  if not r.activada or r.enlace_consumido then raise exception 'FALLO 1c: acceso real mal clasificado: %', r; end if;
  reset role;

  -- Solo la administración la consulta.
  perform set_config('request.jwt.claims', json_build_object('sub', u_eyc, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.cuentas_admin(); if n <> 0 then raise exception 'FALLO 2a: EyC ve el estado de las cuentas (%)', n; end if;
  reset role;
  set local role anon;
  ok := false; begin perform 1 from public.cuentas_admin(); exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALLO 2b: anon ejecuta cuentas_admin'; end if;
  reset role;
  raise exception 'CUENTAS_OK (2)';
end $$;
