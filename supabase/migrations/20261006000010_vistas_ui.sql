-- 010 · Vistas y RPC de apoyo a la interfaz (lectura enriquecida y escrituras atómicas).

-- Listado de evaluaciones con nombres y puntaje (calculado en v_evaluacion_puntaje).
create view public.v_evaluaciones with (security_invoker = true) as
select e.id as evaluacion_id, e.persona_id, p.nombre as persona_nombre, e.ambito,
       e.asignacion_id, a.comision_id, co.sigla as comision_sigla, co.nombre as comision_nombre,
       ca.nombre as cargo_nombre,
       e.actividad_id, ac.nombre as actividad_nombre, ac.tipo as actividad_tipo,
       coalesce(ac.fecha, e.fecha_jornada) as fecha, e.fecha_jornada,
       e.fase_id, f.nombre as fase_nombre, f.estado as fase_estado,
       e.corte_id, c.clave as corte_clave, c.nombre as corte_nombre,
       e.estado, vp.puntaje, vp.dimensiones_observadas, vp.pesos_validos,
       e.evaluador_id, pf.nombre as evaluador_nombre,
       e.comentario_general, e.observacion_rotacion, e.actualizado_en, e.completada_en
from public.evaluaciones e
join public.v_evaluacion_puntaje vp on vp.evaluacion_id = e.id
join public.personas p on p.id = e.persona_id
join public.fases f on f.id = e.fase_id
join public.cortes c on c.id = e.corte_id
left join public.asignaciones a on a.id = e.asignacion_id
left join public.comisiones co on co.id = a.comision_id
left join public.cargos ca on ca.id = a.cargo_id
left join public.actividades ac on ac.id = e.actividad_id
left join public.perfiles pf on pf.id = e.evaluador_id;

-- Una fila por persona y corte con todo lo necesario para monitorear y filtrar.
create view public.v_monitoreo with (security_invoker = true) as
select pc.persona_id, pc.nombre, pc.ambito, pc.activa,
       pc.corte_id, pc.corte_clave, pc.corte_nombre,
       pc.puntaje, pc.n_evaluaciones, pc.n_borradores, pc.semaforo, pc.pesos_validos,
       av.comision_id, av.comision_sigla, av.comision_nombre, av.cargo_id, av.cargo_nombre,
       ct.estatus, ct.tiene_pendiente,
       r.id as recomendacion_id, r.recomendacion, r.comentario as recomendacion_comentario,
       d.id as decision_id, d.decision,
       (r.recomendacion = 'sustitucion' or r.semaforo_registrado = 'rojo') as elevada
from public.v_puntaje_corte pc
left join public.v_asignaciones_vigentes av on av.persona_id = pc.persona_id
left join public.v_continuidad_actual ct on ct.persona_id = pc.persona_id
left join public.recomendaciones r on r.persona_id = pc.persona_id and r.corte_id = pc.corte_id
left join public.decisiones d on d.recomendacion_id = r.id;

-- Quién estuvo asignado a una comisión en una jornada, y su evaluación de ese día.
create or replace function public.asignados_en(p_comision smallint, p_fecha date)
returns table (asignacion_id uuid, persona_id uuid, persona_nombre text, ambito public.ambito,
               cargo_id smallint, cargo_nombre text, cargo_orden smallint,
               desde timestamptz, hasta timestamptz, dominante boolean,
               evaluacion_id uuid, evaluacion_estado public.estado_evaluacion)
language sql stable security invoker set search_path = '' as $$
  with dia as (
    select tstzrange((p_fecha::timestamp) at time zone app.zona(),
                     ((p_fecha + 1)::timestamp) at time zone app.zona()) as r
  )
  select a.id, a.persona_id, p.nombre, p.ambito, a.cargo_id, ca.nombre, ca.orden, a.desde, a.hasta,
         (select d.asignacion_id from app.asignacion_dominante(a.persona_id, p_fecha) d) = a.id,
         e.id, e.estado
  from public.asignaciones a
  cross join dia
  join public.personas p on p.id = a.persona_id
  join public.cargos ca on ca.id = a.cargo_id
  left join public.evaluaciones e on e.persona_id = a.persona_id and e.fecha_jornada = p_fecha
  where a.comision_id = p_comision and tstzrange(a.desde, a.hasta) && dia.r
  order by ca.orden, p.nombre
$$;

-- Pesos de dimensión de un ámbito en una sola transacción; deben sumar 100.
create or replace function public.guardar_pesos(p_ambito public.ambito, p_pesos jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_suma numeric;
begin
  update public.pesos_dimension pd set peso = (p_pesos ->> pd.dimension_id::text)::numeric
  where pd.ambito = p_ambito and p_pesos ? pd.dimension_id::text
    and pd.peso is distinct from (p_pesos ->> pd.dimension_id::text)::numeric;
  select sum(peso) into v_suma from public.pesos_dimension where ambito = p_ambito;
  if v_suma <> 100 then
    raise exception 'Los pesos deben sumar 100 (suman %).', v_suma;
  end if;
end $$;

-- Pesos y umbrales de los cortes en una sola transacción; los pesos deben sumar 100.
create or replace function public.guardar_cortes(p_cortes jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_suma numeric;
begin
  update public.cortes c set
    peso = (x->>'peso')::numeric,
    umbral_verde = (x->>'umbral_verde')::numeric,
    umbral_amarillo = (x->>'umbral_amarillo')::numeric
  from jsonb_array_elements(p_cortes) x
  where c.id = (x->>'id')::smallint;
  select sum(peso) into v_suma from public.cortes;
  if v_suma <> 100 then
    raise exception 'Los pesos de los cortes deben sumar 100 (suman %).', v_suma;
  end if;
end $$;

-- Reprograma el evento: actualiza configuración y fechas de las fases del evento.
create or replace function public.reprogramar_evento(p_inicio date, p_dias integer)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_dias < 3 then raise exception 'El evento debe durar al menos 3 días.'; end if;
  update public.config set valor = to_jsonb(p_inicio::text), provisional = false where clave = 'evento_inicio';
  update public.config set valor = to_jsonb(p_dias), provisional = false where clave = 'evento_dias';
  update public.fases set inicio = p_inicio,              fin = p_inicio + 1           where clave = 'evento_d1_2';
  update public.fases set inicio = p_inicio + 1,          fin = p_inicio + 1           where clave = 'corte2';
  update public.fases set inicio = p_inicio + 2,          fin = p_inicio + p_dias - 1  where clave = 'evento_d3_6';
  update public.fases set inicio = p_inicio + p_dias - 1, fin = null                   where clave = 'cierre';
end $$;

-- Alta de una o varias personas con su asignación inicial, todo o nada.
-- p: [{nombre, ambito, comision_id?, cargo_id?, correo?}]
create or replace function public.alta_personas(p jsonb, p_desde timestamptz default now())
returns integer language plpgsql security invoker set search_path = '' as $$
declare x jsonb; v_id uuid; n integer := 0;
begin
  for x in select * from jsonb_array_elements(p) loop
    insert into public.personas (nombre, ambito, comision_origen_id, cargo_base_id, correo)
    values (trim(x->>'nombre'), (x->>'ambito')::public.ambito, nullif(x->>'comision_id', '')::smallint,
            nullif(x->>'cargo_id', '')::smallint, nullif(trim(x->>'correo'), ''))
    returning id into v_id;
    if nullif(x->>'comision_id', '') is not null and nullif(x->>'cargo_id', '') is not null then
      perform public.mover_asignaciones(
        jsonb_build_array(jsonb_build_object('persona_id', v_id, 'comision_id', x->>'comision_id', 'cargo_id', x->>'cargo_id')),
        'inicial', p_desde, null);
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;
grant execute on function public.keepalive() to anon;
grant select on all tables in schema public to authenticated;
