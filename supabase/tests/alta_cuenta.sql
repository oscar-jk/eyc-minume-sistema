-- El rol de una cuenta recién creada no se pierde. Resultado esperado: ERROR "ALTA_CUENTA_OK (n)".
do $$
declare
  u1 uuid := '00000000-0000-0000-0000-0000000000f1';
  u2 uuid := '00000000-0000-0000-0000-0000000000f2';
  u3 uuid := '00000000-0000-0000-0000-0000000000f3';
  c_ctd smallint; r record;
begin
  select id into c_ctd from public.comisiones where clave = 'ctd';

  -- 1. Como lo hace el servicio de autenticación: inserta sin rol y lo escribe después.
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values (u1, 'f1@prueba.test', '{}', '{"nombre":"Nuevo admin"}');
  select rol, comision_id, email into r from public.perfiles where id = u1;
  if r.rol is not null then raise exception 'FALLO 1a: no debería tener rol antes de la segunda escritura'; end if;
  update auth.users set raw_app_meta_data = '{"rol":"admin","comision_id":null}' where id = u1;
  select rol, comision_id, email into r from public.perfiles where id = u1;
  if r.rol is distinct from 'admin' then raise exception 'FALLO 1b: el rol no llegó al perfil (%)', r.rol; end if;
  if r.email <> 'f1@prueba.test' then raise exception 'FALLO 1c: el correo del perfil cambió (%)', r.email; end if;

  -- 2. EyC con comisión.
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values (u2, 'f2@prueba.test', '{}', '{"nombre":"EyC nuevo"}');
  update auth.users set raw_app_meta_data = jsonb_build_object('rol', 'eyc', 'comision_id', c_ctd) where id = u2;
  select rol, comision_id into r from public.perfiles where id = u2;
  if r.rol is distinct from 'eyc' or r.comision_id is distinct from c_ctd then raise exception 'FALLO 2: EyC sin rol o comisión (% / %)', r.rol, r.comision_id; end if;

  -- 3. Un rol cambiado a mano no se pisa cuando app_metadata cambia después.
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values (u3, 'f3@prueba.test', '{"rol":"subsecretario"}', '{"nombre":"Sub"}');
  update public.perfiles set rol = 'secretario' where id = u3;
  update auth.users set raw_app_meta_data = '{"rol":"subsecretario","otra":"cosa"}' where id = u3;
  select rol into r from public.perfiles where id = u3;
  if r.rol is distinct from 'secretario' then raise exception 'FALLO 3: se pisó el rol asignado a mano (%)', r.rol; end if;

  -- 4. Un cambio de app_metadata sin rol no inventa uno.
  update public.perfiles set rol = null where id = u3;
  update auth.users set raw_app_meta_data = '{"otra":"cosa"}' where id = u3;
  select rol into r from public.perfiles where id = u3;
  if r.rol is not null then raise exception 'FALLO 4: inventó un rol (%)', r.rol; end if;

  raise exception 'ALTA_CUENTA_OK (4)';
end $$;
