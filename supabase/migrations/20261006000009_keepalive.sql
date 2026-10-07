-- 009 · Keepalive para el plan gratuito (GitHub Actions cada 3 días).
-- Única función ejecutable por anon: no lee ni escribe ninguna tabla, solo devuelve la hora del servidor.
create function public.keepalive() returns timestamptz
language sql stable security invoker set search_path = '' as $$ select now() $$;
revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
