-- 008 · Endurecimiento según advisors:
--  · Las RPC security definer pasan al esquema interno "app"; en public quedan envoltorios security invoker.
--  · Las políticas "for all" se separan por comando para no duplicar políticas permisivas en SELECT.

alter function public.registrar_recomendacion(uuid, smallint, public.estatus_continuidad, text) set schema app;
alter function public.mover_asignaciones(jsonb, public.motivo_asignacion, timestamptz, text) set schema app;
alter function public.decidir(uuid, public.estatus_continuidad, text, jsonb) set schema app;
alter function public.sustituir(uuid, jsonb, timestamptz, text) rename to sustituir_api;
alter function public.sustituir_api(uuid, jsonb, timestamptz, text) set schema app;

create function public.registrar_recomendacion(
  p_persona uuid, p_corte smallint, p_recomendacion public.estatus_continuidad, p_comentario text default null)
returns uuid language sql security invoker set search_path = '' as $$
  select app.registrar_recomendacion(p_persona, p_corte, p_recomendacion, p_comentario)
$$;

create function public.mover_asignaciones(
  p_movs jsonb, p_motivo public.motivo_asignacion default 'rotacion', p_desde timestamptz default now(), p_nota text default null)
returns void language sql security invoker set search_path = '' as $$
  select app.mover_asignaciones(p_movs, p_motivo, p_desde, p_nota)
$$;

create function public.decidir(
  p_recomendacion uuid, p_decision public.estatus_continuidad, p_comentario text default null, p_sustitucion jsonb default null)
returns uuid language sql security invoker set search_path = '' as $$
  select app.decidir(p_recomendacion, p_decision, p_comentario, p_sustitucion)
$$;

create function public.sustituir(
  p_saliente uuid, p_entrante jsonb, p_desde timestamptz default now(), p_nota text default null)
returns uuid language sql security invoker set search_path = '' as $$
  select app.sustituir_api(p_saliente, p_entrante, p_desde, p_nota)
$$;

revoke all on all functions in schema public from anon, public;
revoke all on all functions in schema app from anon, public;
grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema app to authenticated;

-- ───────────── Políticas de escritura por comando ─────────────
do $$
declare t text; cond text; cmd text;
begin
  foreach t in array array['pesos_dimension','cortes','fases','config','criterios','comisiones','cargos'] loop
    cond := case when t in ('comisiones','cargos') then $c$(select app.rol()) = 'admin'$c$
                 else $c$(select app.es(array['subsecretario','admin']::public.rol_app[]))$c$ end;
    execute format('drop policy escritura on public.%I', t);
    execute format('create policy alta on public.%I for insert to authenticated with check (%s)', t, cond);
    execute format('create policy edicion on public.%I for update to authenticated using (%s) with check (%s)', t, cond, cond);
    execute format('create policy borrado on public.%I for delete to authenticated using (%s)', t, cond);
  end loop;

  foreach t in array array['respuestas','evaluacion_dimensiones'] loop
    execute format('drop policy escritura on public.%I', t);
    execute format('create policy alta on public.%I for insert to authenticated with check (app.puedo_editar_evaluacion(evaluacion_id))', t);
    execute format('create policy edicion on public.%I for update to authenticated using (app.puedo_editar_evaluacion(evaluacion_id)) with check (app.puedo_editar_evaluacion(evaluacion_id))', t);
    execute format('create policy borrado on public.%I for delete to authenticated using (app.puedo_editar_evaluacion(evaluacion_id))', t);
  end loop;
end $$;

drop policy escritura on public.actividades;
create policy alta on public.actividades for insert to authenticated
  with check ((select app.es(array['subsecretario','admin']::public.rol_app[]))
         or ((select app.rol()) = 'eyc' and comision_id = (select app.comision()) and ambito = 'mesa'));
create policy edicion on public.actividades for update to authenticated
  using ((select app.es(array['subsecretario','admin']::public.rol_app[]))
         or ((select app.rol()) = 'eyc' and comision_id = (select app.comision())))
  with check ((select app.es(array['subsecretario','admin']::public.rol_app[]))
         or ((select app.rol()) = 'eyc' and comision_id = (select app.comision()) and ambito = 'mesa'));
create policy borrado on public.actividades for delete to authenticated
  using ((select app.es(array['subsecretario','admin']::public.rol_app[]))
         or ((select app.rol()) = 'eyc' and comision_id = (select app.comision())));
