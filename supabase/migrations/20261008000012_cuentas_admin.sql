-- 012 · Cuentas para administración: estado de activación (si la persona ya definió su contraseña / entró).
-- El correo de una cuenta solo se puede cambiar mientras no esté activada (lo valida también la Edge Function).
create or replace function app.cuentas_admin()
returns table (id uuid, activada boolean, ultimo_acceso timestamptz)
language sql stable security definer set search_path = '' as $$
  -- Activada = ya entró al menos una vez (definir la contraseña con el enlace inicia sesión).
  select u.id, u.last_sign_in_at is not null, u.last_sign_in_at
  from auth.users u
  where app.rol() = 'admin'
$$;

create or replace function public.cuentas_admin()
returns table (id uuid, activada boolean, ultimo_acceso timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from app.cuentas_admin()
$$;

revoke all on function app.cuentas_admin() from public, anon;
revoke all on function public.cuentas_admin() from public, anon;
grant execute on function app.cuentas_admin() to authenticated;
grant execute on function public.cuentas_admin() to authenticated;
