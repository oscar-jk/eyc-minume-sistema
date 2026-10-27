-- 019 · Dashboard de monitoreo: todas las agregaciones las calcula la base (la pantalla solo dibuja).
--   Corre con los permisos de quien la llama (RLS): cada rol ve solo lo que ya podía ver en el monitoreo.
--   p_ambito: 'mesa', 'eyc' o null (todos).
create or replace function public.dashboard_monitoreo(p_corte integer, p_ambito text default null) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  res jsonb;
begin
  with base as (
    select m.* from public.v_monitoreo m
    where m.corte_id = p_corte and m.activa and (p_ambito is null or m.ambito::text = p_ambito)
  ), evaluadas as (select * from base where puntaje is not null),
  evs as (   -- evaluaciones completas del corte (de personas visibles en la base de arriba)
    select e.evaluacion_id, e.persona_id, e.puntaje, e.estado,
           coalesce(e.fecha_jornada, a.fecha) as dia
    from public.v_evaluacion_puntaje e
    left join public.actividades a on a.id = e.actividad_id
    where e.corte_id = p_corte and e.persona_id in (select persona_id from base)
  )
  select jsonb_build_object(
    'resumen', (select jsonb_build_object(
        'personas', (select count(*) from base),
        'evaluadas', (select count(*) from evaluadas),
        'promedio', (select round(avg(puntaje), 2) from evaluadas),
        'mediana', (select round((percentile_cont(0.5) within group (order by puntaje))::numeric, 2) from evaluadas),
        'minimo', (select min(puntaje) from evaluadas),
        'maximo', (select max(puntaje) from evaluadas),
        'evaluaciones_completas', (select count(*) from evs where estado = 'completa'),
        'borradores', (select count(*) from evs where estado = 'borrador'),
        'verde', (select count(*) from base where semaforo = 'verde'),
        'amarillo', (select count(*) from base where semaforo = 'amarillo'),
        'rojo', (select count(*) from base where semaforo = 'rojo'),
        'gris', (select count(*) from base where coalesce(semaforo::text, 'gris') = 'gris'),
        'con_recomendacion', (select count(*) from base where recomendacion is not null),
        'elevados_pendientes', (select count(*) from base where elevada and decision_id is null),
        'decididos', (select count(*) from base where decision_id is not null),
        'rojos_sin_recomendacion', (select count(*) from base where semaforo = 'rojo' and recomendacion is null))),
    'distribucion', (select coalesce(jsonb_agg(jsonb_build_object('desde', b.desde, 'hasta', b.desde + 10, 'n', b.n) order by b.desde), '[]')
        from (select g.desde, (select count(*) from evaluadas e where least(floor(e.puntaje / 10) * 10, 90) = g.desde) as n
              from generate_series(0, 90, 10) as g(desde)) b),
    'por_comision', (select coalesce(jsonb_agg(x order by (x ->> 'promedio')::numeric desc nulls last), '[]')
        from (select jsonb_build_object('comision_id', b.comision_id, 'sigla', coalesce(b.comision_sigla, b.comision_nombre), 'personas', count(*),
                'evaluadas', count(b.puntaje), 'promedio', round(avg(b.puntaje), 2), 'minimo', min(b.puntaje), 'maximo', max(b.puntaje),
                'verde', count(*) filter (where b.semaforo = 'verde'), 'amarillo', count(*) filter (where b.semaforo = 'amarillo'),
                'rojo', count(*) filter (where b.semaforo = 'rojo')) as x
              from base b where b.comision_id is not null group by b.comision_id, b.comision_sigla, b.comision_nombre) q),
    'por_cargo', (select coalesce(jsonb_agg(jsonb_build_object('cargo', c.cargo, 'evaluadas', c.n, 'promedio', c.prom) order by c.prom desc nulls last), '[]')
        from (select coalesce(cargo_nombre, 'Sin cargo') as cargo, count(puntaje) as n, round(avg(puntaje), 2) as prom from base group by 1) c),
    'por_dimension', (select coalesce(jsonb_agg(jsonb_build_object('clave', d.clave, 'nombre', d.nombre, 'seccion', d.seccion, 'orden', d.orden,
                'promedio', q.prom, 'observaciones', q.n, 'puntos', d.peso) order by d.orden), '[]')
        from (select vd.dimension_id, round(avg(vd.puntos), 2) as prom, count(*) as n
              from public.v_evaluacion_dimension vd
              where vd.observada and vd.evaluacion_id in (select evaluacion_id from evs where estado = 'completa')
              group by vd.dimension_id) q
        join (select di.id, di.clave, di.nombre, di.seccion, di.orden, max(pd.peso) as peso
              from public.dimensiones di left join public.pesos_dimension pd on pd.dimension_id = di.id group by di.id) d on d.id = q.dimension_id),
    'tendencia', (select coalesce(jsonb_agg(jsonb_build_object('dia', t.dia, 'promedio', t.prom, 'evaluaciones', t.n) order by t.dia), '[]')
        from (select dia, round(avg(puntaje), 2) as prom, count(*) as n from evs where estado = 'completa' and puntaje is not null and dia is not null group by dia) t),
    'mejores', (select coalesce(jsonb_agg(jsonb_build_object('persona_id', r.persona_id, 'nombre', r.nombre, 'comision', coalesce(r.comision_sigla, r.comision_nombre), 'puntaje', r.puntaje, 'n', r.n_evaluaciones) order by r.puntaje desc), '[]')
        from (select * from evaluadas order by puntaje desc, nombre limit 5) r),
    'atencion', (select coalesce(jsonb_agg(jsonb_build_object('persona_id', r.persona_id, 'nombre', r.nombre, 'comision', coalesce(r.comision_sigla, r.comision_nombre), 'puntaje', r.puntaje, 'n', r.n_evaluaciones, 'semaforo', r.semaforo, 'recomendacion', r.recomendacion) order by r.puntaje), '[]')
        from (select * from evaluadas order by puntaje, nombre limit 5) r)
  ) into res;
  return res;
end $$;
revoke all on function public.dashboard_monitoreo(integer, text) from public, anon;
grant execute on function public.dashboard_monitoreo(integer, text) to authenticated;
