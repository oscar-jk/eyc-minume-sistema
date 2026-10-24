-- 016 · Calificación inicial y puntuación para decidir las rotaciones.
--   Calificación inicial = examen 50 % + evaluación institucional 30 % + evaluación entre pares 20 % (pesos editables).
--     · El examen y los pares los captura la Subsecretaría de Evaluación y Control.
--     · La evaluación institucional es la nota del Corte 1 (rúbrica de la preparación): sale sola.
--   Puntuación para rotar (Día 2 y Día 3) = calificación inicial + feedback de delegados + feedback de compañeros de mesa
--     + valoración de EyC (la rúbrica de las jornadas anteriores), con pesos por día editables. Lo que todavía no existe
--     no cuenta como cero: sale del cálculo y los pesos del resto se reescalan.
--   El feedback viene de los formularios: un formulario puede declararse «feedback de delegados» o «de compañeros de mesa»
--   y sus preguntas de escala marcadas «cuenta para la puntuación» se normalizan a 0–100.

insert into public.config (clave, valor, descripcion) values
  ('ponderacion_inicial', '{"examen":50,"institucional":30,"pares":20}', 'Pesos de la calificación inicial (suman 100).'),
  ('ponderacion_rotacion',
   '{"2":{"inicial":50,"delegados":20,"companeros":15,"eyc":15},"3":{"inicial":30,"delegados":30,"companeros":20,"eyc":20}}',
   'Pesos de cada fuente para decidir la rotación del Día 2 y del Día 3 (cada día suma 100).')
on conflict (clave) do nothing;

create table public.calificacion_inicial (
  persona_id     uuid primary key references public.personas(id) on delete cascade,
  examen         numeric(5,2) check (examen is null or (examen >= 0 and examen <= 100)),
  pares          numeric(5,2) check (pares is null or (pares >= 0 and pares <= 100)),
  notas          text,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles(id) default auth.uid()
);
create index on public.calificacion_inicial (actualizado_por);
alter table public.calificacion_inicial enable row level security;
revoke all on public.calificacion_inicial from anon, public;
grant select, insert, update, delete on public.calificacion_inicial to authenticated;
create policy lectura on public.calificacion_inicial for select to authenticated using ((select app.privilegiado()));
create policy alta    on public.calificacion_inicial for insert to authenticated with check ((select app.es(array['subsecretario', 'admin']::public.rol_app[])));
create policy edicion on public.calificacion_inicial for update to authenticated
  using ((select app.es(array['subsecretario', 'admin']::public.rol_app[]))) with check ((select app.es(array['subsecretario', 'admin']::public.rol_app[])));
create policy borrado on public.calificacion_inicial for delete to authenticated using ((select app.es(array['subsecretario', 'admin']::public.rol_app[])));
create or replace function app.tg_calificacion_actualizada() returns trigger
language plpgsql security definer set search_path = '' as $$
begin new.actualizado_en := now(); new.actualizado_por := coalesce(auth.uid(), new.actualizado_por); return new; end $$;
create trigger actualizada before insert or update on public.calificacion_inicial for each row execute function app.tg_calificacion_actualizada();
create trigger auditar after insert or update or delete on public.calificacion_inicial for each row execute function app.tg_auditar('persona_id');

-- Qué formularios cuentan como feedback y qué preguntas puntúan.
alter table public.formularios add column fuente text check (fuente is null or fuente in ('delegados', 'companeros'));
alter table public.formulario_campos add column puntua boolean not null default false check (not puntua or tipo = 'escala');

-- ───────────── Calificación inicial por persona ─────────────
create or replace view public.v_calificacion_inicial with (security_invoker = true) as
with w as (
  select coalesce((select (c.valor ->> 'examen')::numeric from public.config c where c.clave = 'ponderacion_inicial'), 50) as examen,
         coalesce((select (c.valor ->> 'institucional')::numeric from public.config c where c.clave = 'ponderacion_inicial'), 30) as institucional,
         coalesce((select (c.valor ->> 'pares')::numeric from public.config c where c.clave = 'ponderacion_inicial'), 20) as pares
)
select p.id as persona_id, p.nombre, ci.examen, c1.puntaje as institucional, ci.pares, ci.notas,
       case when ci.examen is not null and c1.puntaje is not null and ci.pares is not null and (select examen + institucional + pares from w) = 100
            then round((ci.examen * w.examen + c1.puntaje * w.institucional + ci.pares * w.pares) / 100, 2) end as total
from public.personas p
cross join w
left join public.calificacion_inicial ci on ci.persona_id = p.id
left join public.v_puntaje_corte c1 on c1.persona_id = p.id and c1.corte_clave = 'c1'
where p.ambito = 'mesa' and p.activa;

-- ───────────── Puntuación para decidir la rotación de un día ─────────────
-- p_dia: 2 o 3 (día de sesiones). Cada fuente es 0–100 o null si todavía no hay datos.
create or replace function public.puntuacion_rotacion(p_dia integer)
returns table (persona_id uuid, nombre text, inicial numeric, delegados numeric, companeros numeric, eyc numeric,
               peso_inicial numeric, peso_delegados numeric, peso_companeros numeric, peso_eyc numeric, total numeric, pesos_validos boolean)
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_ini date := coalesce((select (c.valor #>> '{}')::date from public.config c where c.clave = 'sesiones_inicio'), date '2026-11-16');
  v_dia date := v_ini + (p_dia - 1);
  v_w jsonb := (select c.valor -> p_dia::text from public.config c where c.clave = 'ponderacion_rotacion');
  wi numeric := coalesce((v_w ->> 'inicial')::numeric, 0);
  wd numeric := coalesce((v_w ->> 'delegados')::numeric, 0);
  wc numeric := coalesce((v_w ->> 'companeros')::numeric, 0);
  we numeric := coalesce((v_w ->> 'eyc')::numeric, 0);
  v_zona text := app.zona();
begin
  if p_dia < 2 then raise exception 'La rotación se decide para el Día 2 en adelante.'; end if;
  return query
  with fb as (   -- puntaje 0–100 de cada envío de feedback = promedio de sus preguntas de escala marcadas
    select e.id as envio_id, f.fuente, e.comision_id, (e.creado_en at time zone v_zona)::date as dia,
           avg(100.0 * ((r.valor #>> '{}')::numeric - coalesce(k.escala_min, 1)) / nullif(coalesce(k.escala_max, 5) - coalesce(k.escala_min, 1), 0)) as nota
    from public.formulario_envios e
    join public.formularios f on f.id = e.formulario_id and f.fuente is not null
    join public.formulario_respuestas r on r.envio_id = e.id
    join public.formulario_campos k on k.id = r.campo_id and k.puntua
    where (e.creado_en at time zone v_zona)::date < v_dia
    group by e.id, f.fuente, e.comision_id, e.creado_en
  ), fb_persona as (   -- el feedback sobre una comisión ese día cuenta para quien la integraba ese día
    select a.persona_id, fb.fuente, avg(fb.nota) as nota
    from fb
    join public.asignaciones a on a.comision_id = fb.comision_id
      and tstzrange(a.desde, a.hasta) && tstzrange((fb.dia::timestamp) at time zone v_zona, ((fb.dia + 1)::timestamp) at time zone v_zona)
    group by a.persona_id, fb.fuente
  ), ev as (   -- valoración de EyC: rúbrica de las jornadas anteriores de las sesiones
    select vp.persona_id, avg(vp.puntaje) as nota
    from public.v_evaluacion_puntaje vp
    where vp.estado = 'completa' and vp.puntaje is not null and vp.fecha_jornada is not null and vp.fecha_jornada >= v_ini and vp.fecha_jornada < v_dia
    group by vp.persona_id
  ), base as (
    select p.id as pid, p.nombre as pnombre, ci.total as t_ini,
           round((select nota from fb_persona x where x.persona_id = p.id and x.fuente = 'delegados'), 2) as t_del,
           round((select nota from fb_persona x where x.persona_id = p.id and x.fuente = 'companeros'), 2) as t_com,
           round((select nota from ev where ev.persona_id = p.id), 2) as t_eyc
    from public.personas p
    left join public.v_calificacion_inicial ci on ci.persona_id = p.id
    where p.ambito = 'mesa' and p.activa
  )
  select b.pid, b.pnombre, b.t_ini, b.t_del, b.t_com, b.t_eyc, wi, wd, wc, we,
         case when (wi + wd + wc + we) = 100 and
                   (case when b.t_ini is not null then wi else 0 end + case when b.t_del is not null then wd else 0 end
                  + case when b.t_com is not null then wc else 0 end + case when b.t_eyc is not null then we else 0 end) > 0
              then round((coalesce(b.t_ini * wi, 0) + coalesce(b.t_del * wd, 0) + coalesce(b.t_com * wc, 0) + coalesce(b.t_eyc * we, 0))
                         / (case when b.t_ini is not null then wi else 0 end + case when b.t_del is not null then wd else 0 end
                          + case when b.t_com is not null then wc else 0 end + case when b.t_eyc is not null then we else 0 end), 2) end,
         (wi + wd + wc + we) = 100
  from base b
  order by b.pnombre;
end $$;

revoke all on function public.puntuacion_rotacion(integer) from public, anon;
grant execute on function public.puntuacion_rotacion(integer) to authenticated;
grant select on public.v_calificacion_inicial to authenticated;
revoke all on public.v_calificacion_inicial from anon, public;
