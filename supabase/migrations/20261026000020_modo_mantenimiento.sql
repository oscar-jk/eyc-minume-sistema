-- 020 · Modo mantenimiento. Cuando el administrador lo activa, el sitio muestra a todos (menos a administradores)
--       una pantalla de «volvemos en unos momentos». Viene APAGADO; lo prende y apaga solo un administrador.
--       `estado_sitio` la puede leer cualquiera (incluso sin sesión) para poder avisar en el inicio de sesión y en los formularios públicos.
insert into public.config (clave, valor, descripcion) values
  ('mantenimiento', '{"activo": false, "mensaje": ""}', 'Modo mantenimiento: si está activo, el sitio muestra un aviso de espera a todos menos a los administradores.')
on conflict (clave) do nothing;

create or replace function public.estado_sitio() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object('mantenimiento', coalesce((c.valor ->> 'activo')::boolean, false), 'mensaje', coalesce(c.valor ->> 'mensaje', ''))
     from public.config c where c.clave = 'mantenimiento'),
    jsonb_build_object('mantenimiento', false, 'mensaje', ''))
$$;
revoke all on function public.estado_sitio() from public;
grant execute on function public.estado_sitio() to anon, authenticated;
