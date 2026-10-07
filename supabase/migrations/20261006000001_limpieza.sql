-- 001 · Limpieza: elimina el esquema de la v1 (public) y el esquema exploratorio "sirio".
-- Todas las tablas estaban vacías al momento de ejecutar (verificado 2026-10-06).

drop trigger if exists limpiar_flag_contrasena on auth.users;

drop schema if exists sirio cascade;

drop table if exists
  public.evaluaciones,
  public.cortes,
  public.config_cortes,
  public.talleres,
  public.miembros,
  public.usuarios,
  public.comisiones,
  public.keepalive
cascade;

-- Funciones sueltas de la v1 en public (sin tocar las de extensiones).
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
end $$;
