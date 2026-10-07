-- 011 · Edición de catálogos desde la interfaz: dimensiones editables (nombre y competencias) por Subsecretaría y admin, con auditoría.
grant update on public.dimensiones to authenticated;
create policy edicion on public.dimensiones for update to authenticated
  using ((select app.es(array['subsecretario','admin']::public.rol_app[])))
  with check ((select app.es(array['subsecretario','admin']::public.rol_app[])));
create trigger auditar after insert or update or delete on public.dimensiones
  for each row execute function app.tg_auditar();
