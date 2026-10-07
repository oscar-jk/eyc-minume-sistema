-- 007 · Seguridad: RLS en todas las tablas, anon sin acceso, permisos por rol.
-- Las escrituras sensibles (asignaciones, recomendaciones, decisiones) solo ocurren vía RPC security definer.

-- La auditoría de config usa su clave natural.
drop trigger auditar on public.config;
create trigger auditar after insert or update or delete on public.config
  for each row execute function app.tg_auditar('clave');

-- ───────────── Privilegios base ─────────────
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;
revoke all on all functions in schema app    from anon, public;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon, public;
alter default privileges in schema app    revoke all on functions from anon, public;

grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema app    to authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update, delete on
  public.pesos_dimension, public.cortes, public.fases, public.config, public.criterios,
  public.comisiones, public.cargos, public.perfiles, public.personas, public.actividades,
  public.evaluaciones, public.respuestas, public.evaluacion_dimensiones
to authenticated;

-- ───────────── Helpers de política ─────────────
create or replace function app.privilegiado() returns boolean
language sql stable security definer set search_path = '' as $$
  select app.es(array['subsecretario','secretario','admin']::public.rol_app[])
$$;

create or replace function app.asignacion_en_mi_comision(p_asig uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.asignaciones a where a.id = p_asig and a.comision_id = app.comision())
$$;

create or replace function app.evalua_eyc() returns boolean
language sql stable security definer set search_path = '' as $$
  select app.rol() = 'admin'
      or app.rol()::text = (select c.valor #>> '{}' from public.config c where c.clave = 'evaluador_eyc')
$$;

create or replace function app.puedo_editar_evaluacion(p_eval uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.evaluaciones e
                 where e.id = p_eval and (e.evaluador_id = auth.uid() or app.rol() = 'admin'))
$$;

grant execute on all functions in schema app to authenticated;
revoke all on all functions in schema app from anon, public;

-- ───────────── Activar RLS ─────────────
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ───────────── Catálogos: lectura para cualquier cuenta con rol ─────────────
do $$
declare t text;
begin
  foreach t in array array['comisiones','cargos','dimensiones','criterios','criterios_historial',
                           'pesos_dimension','cortes','fases','config'] loop
    execute format('create policy lectura on public.%I for select to authenticated using ((select app.rol()) is not null)', t);
  end loop;
  -- Configuración de cálculo: Subsecretaría y admin.
  foreach t in array array['pesos_dimension','cortes','fases','config','criterios'] loop
    execute format($f$create policy escritura on public.%I for all to authenticated
      using ((select app.es(array['subsecretario','admin']::public.rol_app[])))
      with check ((select app.es(array['subsecretario','admin']::public.rol_app[])))$f$, t);
  end loop;
  -- Estructura: solo admin.
  foreach t in array array['comisiones','cargos'] loop
    execute format($f$create policy escritura on public.%I for all to authenticated
      using ((select app.rol()) = 'admin') with check ((select app.rol()) = 'admin')$f$, t);
  end loop;
end $$;

-- ───────────── Perfiles ─────────────
create policy lectura on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select app.rol()) is not null);
create policy escritura on public.perfiles for update to authenticated
  using ((select app.rol()) = 'admin') with check ((select app.rol()) = 'admin');
create policy borrado on public.perfiles for delete to authenticated
  using ((select app.rol()) = 'admin');

-- ───────────── Personas ─────────────
create policy lectura on public.personas for select to authenticated
  using ((select app.privilegiado())
         or ((select app.rol()) = 'eyc' and app.persona_en_mi_comision(id)));
create policy alta on public.personas for insert to authenticated
  with check ((select app.es(array['subsecretario','admin']::public.rol_app[])));
create policy edicion on public.personas for update to authenticated
  using ((select app.es(array['subsecretario','admin']::public.rol_app[])))
  with check ((select app.es(array['subsecretario','admin']::public.rol_app[])));
create policy borrado on public.personas for delete to authenticated
  using ((select app.rol()) = 'admin');

-- ───────────── Asignaciones (escritura solo vía RPC) ─────────────
create policy lectura on public.asignaciones for select to authenticated
  using ((select app.privilegiado())
         or ((select app.rol()) = 'eyc' and app.persona_en_mi_comision(persona_id)));

-- ───────────── Actividades ─────────────
create policy lectura on public.actividades for select to authenticated
  using ((select app.privilegiado())
         or ((select app.rol()) = 'eyc' and (comision_id is null or comision_id = (select app.comision()))));
create policy escritura on public.actividades for all to authenticated
  using ((select app.es(array['subsecretario','admin']::public.rol_app[]))
         or ((select app.rol()) = 'eyc' and comision_id = (select app.comision())))
  with check ((select app.es(array['subsecretario','admin']::public.rol_app[]))
         or ((select app.rol()) = 'eyc' and comision_id = (select app.comision()) and ambito = 'mesa'));

-- ───────────── Evaluaciones ─────────────
create policy lectura on public.evaluaciones for select to authenticated
  using ((select app.privilegiado())
         or ((select app.rol()) = 'eyc' and ambito = 'mesa' and app.persona_en_mi_comision(persona_id)));
create policy alta on public.evaluaciones for insert to authenticated
  with check (
    evaluador_id = (select auth.uid()) and (
      ((select app.rol()) = 'eyc' and ambito = 'mesa' and app.asignacion_en_mi_comision(asignacion_id))
      or (ambito = 'eyc' and (select app.evalua_eyc()))
      or (select app.rol()) = 'admin'));
create policy edicion on public.evaluaciones for update to authenticated
  using (evaluador_id = (select auth.uid()) or (select app.rol()) = 'admin')
  with check (evaluador_id = (select auth.uid()) or (select app.rol()) = 'admin');
create policy borrado on public.evaluaciones for delete to authenticated
  using (estado = 'borrador' and (evaluador_id = (select auth.uid()) or (select app.rol()) = 'admin'));

do $$
declare t text;
begin
  foreach t in array array['respuestas','evaluacion_dimensiones'] loop
    execute format($f$create policy lectura on public.%I for select to authenticated
      using (exists (select 1 from public.evaluaciones e where e.id = evaluacion_id))$f$, t);
    execute format($f$create policy escritura on public.%I for all to authenticated
      using (app.puedo_editar_evaluacion(evaluacion_id)) with check (app.puedo_editar_evaluacion(evaluacion_id))$f$, t);
  end loop;
end $$;

-- ───────────── Continuidad (escritura solo vía RPC) ─────────────
create policy lectura on public.recomendaciones for select to authenticated
  using ((select app.privilegiado())
         or ((select app.rol()) = 'eyc' and app.persona_en_mi_comision(persona_id)));
create policy lectura on public.decisiones for select to authenticated
  using ((select app.privilegiado())
         or ((select app.rol()) = 'eyc' and app.persona_en_mi_comision(persona_id)));

-- ───────────── Auditoría ─────────────
create policy lectura on public.auditoria for select to authenticated
  using ((select app.es(array['subsecretario','admin']::public.rol_app[])));
