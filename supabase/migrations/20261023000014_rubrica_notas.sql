-- 014 · Rúbrica de la mesa directiva: 9 criterios, cada uno con una nota de 0 a sus puntos (los puntos suman 100),
--       agrupados en secciones. Toda nota lleva descripción, incluso cuando el criterio no se observó (N/A).
--       Un criterio N/A sale del cálculo y el resto se reescala a 100. La rúbrica de EyC (Sí/No) no cambia.

do $$ begin
  if exists (select 1 from public.evaluaciones where ambito = 'mesa') then
    raise exception 'Ya hay evaluaciones de mesa directiva guardadas: reemplazar la rúbrica cambiaría sus puntajes. Revísalo antes de aplicar esta migración.';
  end if;
end $$;

-- ───────────────────────── Estructura ─────────────────────────
alter table public.dimensiones add column seccion text;            -- agrupa las dimensiones en la pantalla de evaluación

alter table public.criterios
  add column tipo text not null default 'si_no' check (tipo in ('si_no', 'nota')),
  add column nota_max numeric(5,2) check (nota_max is null or nota_max > 0),
  add constraint criterios_nota_coherente check ((tipo = 'nota') = (nota_max is not null));

alter table public.respuestas
  add column nota numeric(5,2),
  add column nota_max numeric(5,2);                                -- instantánea de los puntos del criterio al calificar
alter table public.respuestas add constraint respuestas_nota_valida check (
  (nota_max is null and nota is null)
  or (nota_max is not null and (
        (respuesta = 'no_observado' and nota is null)
     or (respuesta <> 'no_observado' and nota is not null and nota >= 0 and nota <= nota_max))));

-- Instantánea del criterio en cada respuesta (también la nota máxima) y validación de la nota.
create or replace function app.tg_respuesta_snapshot() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_c public.criterios; v_amb public.ambito;
begin
  if tg_op = 'UPDATE' and new.criterio_id = old.criterio_id then
    new.dimension_id := old.dimension_id; new.favorable := old.favorable; new.texto := old.texto; new.nota_max := old.nota_max;
  else
    select * into v_c from public.criterios where id = new.criterio_id;
    select e.ambito into v_amb from public.evaluaciones e where e.id = new.evaluacion_id;
    if v_c.ambito <> v_amb then raise exception 'El criterio % no corresponde al ámbito de la evaluación.', v_c.codigo; end if;
    new.dimension_id := v_c.dimension_id; new.favorable := v_c.favorable; new.texto := v_c.texto; new.nota_max := v_c.nota_max;
  end if;
  if new.nota_max is null then
    new.nota := null;
  elsif new.respuesta = 'no_observado' then
    new.nota := null;
  else
    new.respuesta := 'si';
    if new.nota is null then raise exception 'Falta la nota del criterio %.', coalesce(v_c.codigo, new.criterio_id::text); end if;
    if new.nota < 0 or new.nota > new.nota_max then
      raise exception 'La nota de % debe estar entre 0 y %.', coalesce(v_c.codigo, new.criterio_id::text), new.nota_max;
    end if;
  end if;
  return new;
end $$;

-- Puntos por dimensión: con criterios de nota, nota obtenida / nota máxima de lo observado; con Sí/No, % favorable (como antes).
create or replace view public.v_evaluacion_dimension with (security_invoker = true) as
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
            then case when bool_or(r.nota_max is not null)
                      then round(100.0 * sum(r.nota) filter (where r.respuesta <> 'no_observado')
                                 / nullif(sum(r.nota_max) filter (where r.respuesta <> 'no_observado'), 0), 2)
                      else round(100.0 * count(r.criterio_id) filter (where r.respuesta = r.favorable)
                                 / count(r.criterio_id) filter (where r.respuesta <> 'no_observado'), 2)
                 end
       end as puntos
from public.evaluaciones e
join public.pesos_dimension pd on pd.ambito = e.ambito
join public.dimensiones d on d.id = pd.dimension_id
left join public.evaluacion_dimensiones ed on ed.evaluacion_id = e.id and ed.dimension_id = d.id
left join public.respuestas r on r.evaluacion_id = e.id and r.dimension_id = d.id
group by e.id, e.ambito, d.id, d.clave, pd.peso, ed.no_observado;

-- Qué falta para completar: en los criterios de nota, toda nota (incluso N/A) exige descripción.
create or replace function public.faltantes_evaluacion(p_evaluacion uuid)
returns table (dimension text, criterio text, motivo text)
language sql stable security invoker set search_path = '' as $$
  with e as (select * from public.evaluaciones where id = p_evaluacion),
  dims_no as (select ed.dimension_id from public.evaluacion_dimensiones ed
              where ed.evaluacion_id = p_evaluacion and ed.no_observado)
  -- Criterios activos sin respuesta (salvo dimensión marcada N/O).
  select d.clave::text, c.codigo, case when c.tipo = 'nota' then 'Falta calificar' else 'Falta responder' end
  from e join public.criterios c on c.ambito = e.ambito and c.activo
  join public.dimensiones d on d.id = c.dimension_id
  where c.dimension_id not in (select dimension_id from dims_no)
    and not exists (select 1 from public.respuestas r where r.evaluacion_id = e.id and r.criterio_id = c.id)
  union all
  -- Sí/No con respuesta desfavorable sin comentario.
  select d.clave::text, c.codigo, 'Falta comentario: la respuesta es desfavorable'
  from public.respuestas r
  join public.criterios c on c.id = r.criterio_id
  join public.dimensiones d on d.id = r.dimension_id
  where r.evaluacion_id = p_evaluacion
    and r.nota_max is null
    and r.dimension_id not in (select dimension_id from dims_no)
    and r.respuesta <> 'no_observado' and r.respuesta <> r.favorable
    and coalesce(trim(r.comentario), '') = ''
  union all
  -- Criterios de nota: la descripción es obligatoria siempre, también en N/A.
  select d.clave::text, c.codigo, 'Falta la descripción: toda nota, incluso N/A, se justifica'
  from public.respuestas r
  join public.criterios c on c.id = r.criterio_id
  join public.dimensiones d on d.id = r.dimension_id
  where r.evaluacion_id = p_evaluacion
    and r.nota_max is not null
    and r.dimension_id not in (select dimension_id from dims_no)
    and coalesce(trim(r.comentario), '') = ''
  union all
  -- Al menos una dimensión debe haberse observado.
  select null, null, 'Ninguna dimensión fue observada: no hay nada que calificar'
  from e
  where not exists (
    select 1 from public.respuestas r
    where r.evaluacion_id = e.id and r.respuesta <> 'no_observado'
      and r.dimension_id not in (select dimension_id from dims_no))
  order by 1 nulls first, 2
$$;

-- Guardado atómico: ahora cada respuesta puede llevar `nota`.
create or replace function public.guardar_evaluacion(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v_id uuid := nullif(p->>'id', '')::uuid;
        v_estado public.estado_evaluacion := coalesce(nullif(p->>'estado', ''), 'borrador')::public.estado_evaluacion;
begin
  if v_id is null then
    insert into public.evaluaciones (persona_id, actividad_id, fecha_jornada, comentario_general, fase_id, corte_id, ambito)
    values ((p->>'persona_id')::uuid, nullif(p->>'actividad_id', '')::uuid, nullif(p->>'fecha_jornada', '')::date,
            p->>'comentario_general', 0, 0, 'mesa')   -- fase/corte/ámbito los fija el trigger
    returning id into v_id;
  else
    update public.evaluaciones set comentario_general = p->>'comentario_general' where id = v_id;
    if not found then raise exception 'Evaluación no encontrada o sin permiso para editarla.'; end if;
  end if;

  delete from public.respuestas r
  where r.evaluacion_id = v_id
    and r.criterio_id not in (select (x->>'criterio_id')::int from jsonb_array_elements(coalesce(p->'respuestas', '[]')) x);

  insert into public.respuestas (evaluacion_id, criterio_id, respuesta, comentario, nota, dimension_id, favorable, texto)
  select v_id, (x->>'criterio_id')::int, (x->>'respuesta')::public.respuesta_criterio, nullif(trim(x->>'comentario'), ''),
         nullif(x->>'nota', '')::numeric,
         0, 'si', ''   -- instantánea la fija el trigger
  from jsonb_array_elements(coalesce(p->'respuestas', '[]')) x
  on conflict (evaluacion_id, criterio_id) do update
    set respuesta = excluded.respuesta, comentario = excluded.comentario, nota = excluded.nota
    where respuestas.respuesta is distinct from excluded.respuesta
       or respuestas.comentario is distinct from excluded.comentario
       or respuestas.nota is distinct from excluded.nota;

  insert into public.evaluacion_dimensiones (evaluacion_id, dimension_id, no_observado)
  select v_id, d.id, d.id in (select (x #>> '{}')::smallint from jsonb_array_elements(coalesce(p->'dimensiones_no_observadas', '[]')) x)
  from public.dimensiones d
  on conflict (evaluacion_id, dimension_id) do update set no_observado = excluded.no_observado
    where evaluacion_dimensiones.no_observado is distinct from excluded.no_observado;

  update public.evaluaciones set estado = v_estado where id = v_id and estado is distinct from v_estado;
  if v_estado = 'completa' then perform app.validar_completa(v_id); end if;
  return v_id;
end $$;

-- Si la Subsecretaría cambia el peso de una dimensión, la nota máxima de su criterio de nota la sigue
-- (la nota siempre va de 0 a los puntos del criterio). Las evaluaciones ya hechas conservan su nota máxima.
create or replace function app.tg_peso_sincroniza_nota_max() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.peso > 0 then
    update public.criterios c set nota_max = new.peso
    where c.dimension_id = new.dimension_id and c.ambito = new.ambito and c.tipo = 'nota' and c.nota_max is distinct from new.peso;
  end if;
  return null;
end $$;
create trigger peso_sincroniza_nota_max after insert or update of peso on public.pesos_dimension
  for each row execute function app.tg_peso_sincroniza_nota_max();

-- ───────────────────────── Datos: la rúbrica nueva ─────────────────────────
-- Se retira la rúbrica Sí/No A–F de la mesa (la de EyC queda igual).
delete from public.pesos_dimension where ambito = 'mesa';
delete from public.criterios where ambito = 'mesa';

with nuevas (clave, nombre, descripcion, seccion, puntos, orden) as (values
  ('1', 'Dominio procedimental',          'Aplicación correcta del reglamento y seguridad al tomar decisiones.',                                                  'Conducción de la sesión', 15, 11),
  ('2', 'Conducción del debate',          'Capacidad de mantener orden, ritmo y participación.',                                                                  'Conducción de la sesión', 15, 12),
  ('3', 'Manejo del tiempo',              'Capacidad de administrar correctamente el tiempo disponible.',                                                         'Conducción de la sesión', 10, 13),
  ('4', 'Imparcialidad',                  'Trato equilibrado hacia todas las delegaciones.',                                                                      'Decisiones y trato',      10, 14),
  ('5', 'Manejo de situaciones difíciles','Respuesta ante conflictos, errores procedimentales, interrupciones o situaciones inesperadas.',                       'Decisiones y trato',      10, 15),
  ('6', 'Criterio',                       'Capacidad de tomar decisiones razonables incluso cuando el reglamento no ofrece una respuesta automática.',            'Decisiones y trato',      10, 16),
  ('7', 'Comunicación',                   'Claridad al explicar decisiones e instrucciones.',                                                                     'Equipo y evaluación',     10, 17),
  ('8', 'Trabajo en equipo',              'Coordinación con los demás miembros de la mesa.',                                                                      'Equipo y evaluación',     10, 18),
  ('9', 'Capacidad de evaluación',        'Capacidad de observar, valorar y justificar correctamente el desempeño de los delegados.',                             'Equipo y evaluación',     10, 19)
), dims as (
  insert into public.dimensiones (clave, nombre, competencias, orden, seccion)
  select clave, nombre, descripcion, orden, seccion from nuevas
  returning id, clave
), crit as (
  insert into public.criterios (dimension_id, ambito, codigo, texto, favorable, orden, tipo, nota_max)
  select d.id, 'mesa', n.clave, n.descripcion, 'si', 1, 'nota', n.puntos from nuevas n join dims d on d.clave = n.clave
  returning dimension_id
)
insert into public.pesos_dimension (ambito, dimension_id, peso)
select 'mesa', d.id, n.puntos from nuevas n join dims d on d.clave = n.clave;

-- Los pesos de mesa están definidos por la Subsecretaría: no son provisionales.
update public.config set valor = 'true', provisional = false where clave = 'pesos_dimension_confirmados';
