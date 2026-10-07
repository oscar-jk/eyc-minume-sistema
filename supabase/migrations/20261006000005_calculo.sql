-- 005 · Cálculo: todo puntaje, promedio, semáforo y puntaje final vive aquí. El frontend solo lee.

-- Semáforo según umbrales del corte. null → gris (No evaluado), nunca 0.
create or replace function public.semaforo_para(p_puntaje numeric, p_verde numeric, p_amarillo numeric)
returns public.semaforo language sql immutable set search_path = '' as $$
  select case
    when p_puntaje is null then 'gris'
    when p_puntaje >= p_verde then 'verde'
    when p_puntaje >= p_amarillo then 'amarillo'
    else 'rojo' end::public.semaforo
$$;

-- Validez de pesos por ámbito: si no suman 100, el ámbito no se calcula.
create view public.v_pesos_ambito with (security_invoker = true) as
select pd.ambito,
       sum(pd.peso)              as suma,
       sum(pd.peso) = 100        as valido,
       100 - sum(pd.peso)        as diferencia
from public.pesos_dimension pd
group by pd.ambito;

create view public.v_pesos_cortes with (security_invoker = true) as
select sum(c.peso) as suma, sum(c.peso) = 100 as valido, 100 - sum(c.peso) as diferencia
from public.cortes c;

-- Puntos por dimensión de cada evaluación.
-- Puntos = % de criterios con respuesta favorable entre los observados (sí/no).
-- Dimensión marcada N/O, o sin ningún criterio observado → no observada (se excluye).
create view public.v_evaluacion_dimension with (security_invoker = true) as
select e.id  as evaluacion_id,
       e.ambito,
       d.id  as dimension_id,
       d.clave,
       pd.peso,
       coalesce(ed.no_observado, false) as marcada_no_observada,
       count(r.criterio_id) filter (where r.respuesta <> 'no_observado')   as n_observados,
       count(r.criterio_id) filter (where r.respuesta = r.favorable)       as n_favorables,
       (not coalesce(ed.no_observado, false)
        and count(r.criterio_id) filter (where r.respuesta <> 'no_observado') > 0) as observada,
       case when not coalesce(ed.no_observado, false)
                 and count(r.criterio_id) filter (where r.respuesta <> 'no_observado') > 0
            then round(100.0 * count(r.criterio_id) filter (where r.respuesta = r.favorable)
                       / count(r.criterio_id) filter (where r.respuesta <> 'no_observado'), 2)
       end as puntos
from public.evaluaciones e
join public.pesos_dimension pd on pd.ambito = e.ambito
join public.dimensiones d on d.id = pd.dimension_id
left join public.evaluacion_dimensiones ed on ed.evaluacion_id = e.id and ed.dimension_id = d.id
left join public.respuestas r on r.evaluacion_id = e.id and r.dimension_id = d.id
group by e.id, e.ambito, d.id, d.clave, pd.peso, ed.no_observado;

-- Puntaje de una evaluación: promedio ponderado de dimensiones observadas, pesos renormalizados.
create view public.v_evaluacion_puntaje with (security_invoker = true) as
select e.id as evaluacion_id, e.persona_id, e.asignacion_id, e.actividad_id, e.fecha_jornada,
       e.fase_id, e.corte_id, e.ambito, e.estado, e.evaluador_id, e.creado_en, e.actualizado_en,
       e.completada_en, e.observacion_rotacion, e.comentario_general,
       pa.valido as pesos_validos,
       count(*) filter (where vd.observada)::int as dimensiones_observadas,
       case when pa.valido and coalesce(sum(vd.peso) filter (where vd.observada), 0) > 0
            then round(sum(vd.puntos * vd.peso) filter (where vd.observada)
                       / sum(vd.peso) filter (where vd.observada), 2)
       end as puntaje
from public.evaluaciones e
join public.v_evaluacion_dimension vd on vd.evaluacion_id = e.id
join public.v_pesos_ambito pa on pa.ambito = e.ambito
group by e.id, pa.valido;

-- Peso de una evaluación para el promedio ponderado por días asignados.
create or replace function app.dias_asignados(p_asignacion uuid, p_fase smallint) returns integer
language sql stable security definer set search_path = '' as $$
  select greatest(1, coalesce((
    select (upper(r) - lower(r))
    from (
      select daterange((a.desde at time zone app.zona())::date,
                       coalesce((a.hasta at time zone app.zona())::date + 1, 'infinity'::date))
             * daterange(f.inicio, f.fin + 1) as r
      from public.asignaciones a, public.fases f
      where a.id = p_asignacion and f.id = p_fase and f.inicio is not null and f.fin is not null
    ) x where not isempty(r)
  ), 1))
$$;

-- Puntaje por persona y corte (todas las combinaciones: lo no evaluado aparece en gris).
create view public.v_puntaje_corte with (security_invoker = true) as
with metodo as (
  select coalesce((select c.valor #>> '{}' from public.config c where c.clave = 'metodo_promedio'), 'simple') as m
), ev as (
  select vp.persona_id, vp.corte_id, vp.puntaje,
         case when (select m from metodo) = 'ponderado_dias'
              then app.dias_asignados(vp.asignacion_id, vp.fase_id) else 1 end as w
  from public.v_evaluacion_puntaje vp
  where vp.estado = 'completa' and vp.puntaje is not null
), borr as (
  select e.persona_id, e.corte_id, count(*)::int as n
  from public.evaluaciones e where e.estado = 'borrador'
  group by e.persona_id, e.corte_id
)
select p.id as persona_id, p.nombre, p.ambito, p.activa,
       c.id as corte_id, c.clave as corte_clave, c.nombre as corte_nombre, c.peso as corte_peso,
       count(ev.puntaje)::int as n_evaluaciones,
       coalesce(max(b.n), 0)::int as n_borradores,
       round(sum(ev.puntaje * ev.w) / nullif(sum(ev.w), 0), 2) as puntaje,
       public.semaforo_para(round(sum(ev.puntaje * ev.w) / nullif(sum(ev.w), 0), 2), c.umbral_verde, c.umbral_amarillo) as semaforo,
       pa.valido as pesos_validos
from public.personas p
cross join public.cortes c
join public.v_pesos_ambito pa on pa.ambito = p.ambito
left join ev on ev.persona_id = p.id and ev.corte_id = c.id
left join borr b on b.persona_id = p.id and b.corte_id = c.id
group by p.id, c.id, pa.valido;

-- Puntaje final: nulo mientras falte cualquier corte ("en espera").
create view public.v_puntaje_final with (security_invoker = true) as
select pc.persona_id, pc.nombre, pc.ambito, pc.activa,
       max(pc.puntaje) filter (where pc.corte_clave = 'c1')    as c1_puntaje,
       max(pc.n_evaluaciones) filter (where pc.corte_clave = 'c1')    as c1_n,
       max(pc.semaforo::text) filter (where pc.corte_clave = 'c1')::public.semaforo as c1_semaforo,
       max(pc.puntaje) filter (where pc.corte_clave = 'c2')    as c2_puntaje,
       max(pc.n_evaluaciones) filter (where pc.corte_clave = 'c2')    as c2_n,
       max(pc.semaforo::text) filter (where pc.corte_clave = 'c2')::public.semaforo as c2_semaforo,
       max(pc.puntaje) filter (where pc.corte_clave = 'final') as final_puntaje,
       max(pc.n_evaluaciones) filter (where pc.corte_clave = 'final') as final_n,
       max(pc.semaforo::text) filter (where pc.corte_clave = 'final')::public.semaforo as final_semaforo,
       bool_and(pc.puntaje is not null) as completo,
       case when bool_and(pc.puntaje is not null) and (select valido from public.v_pesos_cortes)
            then round(sum(pc.puntaje * pc.corte_peso) / 100, 2) end as puntaje_final
from public.v_puntaje_corte pc
group by pc.persona_id, pc.nombre, pc.ambito, pc.activa;

-- Asignaciones vigentes en este momento, con nombres.
create view public.v_asignaciones_vigentes with (security_invoker = true) as
select a.id as asignacion_id, a.persona_id, p.nombre as persona_nombre, p.ambito,
       a.comision_id, co.clave as comision_clave, co.sigla as comision_sigla, co.nombre as comision_nombre,
       a.cargo_id, ca.nombre as cargo_nombre, ca.orden as cargo_orden, a.desde, a.motivo
from public.asignaciones a
join public.personas p on p.id = a.persona_id
join public.comisiones co on co.id = a.comision_id
join public.cargos ca on ca.id = a.cargo_id
where a.desde <= now() and (a.hasta is null or a.hasta > now());

-- Contexto temporal para el encabezado: hoy, día del evento y fases abiertas.
create or replace function public.contexto_actual()
returns table (hoy date, dia_evento integer, evento_dias integer, evento_inicio date)
language sql stable security invoker set search_path = '' as $$
  with cfg as (
    select (select (c.valor #>> '{}')::date from public.config c where c.clave = 'evento_inicio') as ini,
           (select (c.valor #>> '{}')::int  from public.config c where c.clave = 'evento_dias')   as dias
  )
  select app.hoy(),
         case when app.hoy() between cfg.ini and cfg.ini + cfg.dias - 1 then (app.hoy() - cfg.ini) + 1 end,
         cfg.dias, cfg.ini
  from cfg
$$;
