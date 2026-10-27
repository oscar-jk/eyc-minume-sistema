-- 022 · Estado de las cuentas para la administración: quién ya accedió, quién no, cuándo se le envió el correo y si su enlace
--       se «gastó» solo. Algunos correos (Gmail, Outlook, antivirus) abren los enlaces para revisarlos; como el enlace es de un solo uso,
--       la persona lo encuentra vencido aunque nunca lo haya abierto. Un acceso a los pocos minutos de crear la cuenta se trata como eso.
drop function public.cuentas_admin();
drop function app.cuentas_admin();

create function app.cuentas_admin()
returns table (id uuid, activada boolean, ultimo_acceso timestamptz, correo_enviado_en timestamptz, creada_en timestamptz, enlace_consumido boolean)
language sql stable security definer set search_path = '' as $$
  select u.id,
         (u.last_sign_in_at is not null and u.last_sign_in_at >= u.created_at + interval '3 minutes'),
         u.last_sign_in_at,
         u.recovery_sent_at,
         u.created_at,
         (u.last_sign_in_at is not null and u.last_sign_in_at < u.created_at + interval '3 minutes')
  from auth.users u
  where app.rol() = 'admin'
$$;
create function public.cuentas_admin()
returns table (id uuid, activada boolean, ultimo_acceso timestamptz, correo_enviado_en timestamptz, creada_en timestamptz, enlace_consumido boolean)
language sql stable security invoker set search_path = '' as $$
  select * from app.cuentas_admin()
$$;
revoke all on function app.cuentas_admin() from public, anon;
revoke all on function public.cuentas_admin() from public, anon;
grant execute on function app.cuentas_admin() to authenticated;
grant execute on function public.cuentas_admin() to authenticated;
