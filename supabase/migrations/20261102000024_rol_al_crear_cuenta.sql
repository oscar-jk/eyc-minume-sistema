-- 024 · El rol y la comisión de una cuenta nueva no se perdían a propósito: se perdían por el orden de escritura.
--   Al crear una cuenta, el servicio de autenticación inserta el usuario SIN app_metadata y la escribe en una segunda
--   operación. El trigger de alta (003) solo mira el INSERT, así que el perfil nacía con rol nulo y la persona entraba
--   sin acceso hasta que la administración se lo asignaba a mano.
--   Ahora, cuando app_metadata cambia y el perfil todavía no tiene rol, el perfil lo toma de ahí. Un rol ya asignado
--   (incluido uno cambiado a mano) nunca se pisa.
create or replace function app.tg_sincroniza_rol_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data is distinct from old.raw_app_meta_data then
    update public.perfiles p
    set rol = nullif(new.raw_app_meta_data->>'rol', '')::public.rol_app,
        comision_id = nullif(new.raw_app_meta_data->>'comision_id', '')::smallint
    where p.id = new.id
      and p.rol is null
      and nullif(new.raw_app_meta_data->>'rol', '') is not null;
  end if;
  return new;
end $$;

create trigger en_cambio_app_metadata after update of raw_app_meta_data on auth.users
  for each row execute function app.tg_sincroniza_rol_usuario();

-- Perfiles que ya quedaron sin rol aunque su app_metadata lo trae (cuentas creadas antes de esta corrección).
update public.perfiles p
set rol = (u.raw_app_meta_data->>'rol')::public.rol_app,
    comision_id = nullif(u.raw_app_meta_data->>'comision_id', '')::smallint
from auth.users u
where u.id = p.id and p.rol is null and nullif(u.raw_app_meta_data->>'rol', '') is not null;
