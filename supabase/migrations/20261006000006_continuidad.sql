-- 006 · Continuidad (recomendación → decisión → sustitución), movimientos de asignación, cobertura y auditoría.

create table public.recomendaciones (
  id                  uuid primary key default gen_random_uuid(),
  persona_id          uuid not null references public.personas(id),
  corte_id            smallint not null references public.cortes(id),
  recomendacion       public.estatus_continuidad not null,
  comentario          text,
  puntaje_registrado  numeric(5,2),
  semaforo_registrado public.semaforo not null,
  n_evaluaciones      integer not null default 0,
  autor_id            uuid not null references public.perfiles(id),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  unique (persona_id, corte_id)
);
create index on public.recomendaciones (corte_id);
create index on public.recomendaciones (autor_id);

create table public.decisiones (
  id               uuid primary key default gen_random_uuid(),
  recomendacion_id uuid not null unique references public.recomendaciones(id),
  persona_id       uuid not null references public.personas(id),
  corte_id         smallint not null references public.cortes(id),
  decision         public.estatus_continuidad not null,
  comentario       text,
  elevada          boolean not null,
  autor_id         uuid not null references public.perfiles(id),
  creado_en        timestamptz not null default now()
);
create index on public.decisiones (persona_id, creado_en desc);
create index on public.decisiones (corte_id);
create index on public.decisiones (autor_id);

create table public.auditoria (
  id        bigint generated always as identity primary key,
  tabla     text not null,
  registro  text,
  accion    text not null,
  autor     uuid default auth.uid(),
  fecha     timestamptz not null default now(),
  antes     jsonb,
  despues   jsonb
);
create index on public.auditoria (tabla, fecha desc);
create index on public.auditoria (autor);

-- ───────────────────────── Helpers ─────────────────────────
create or replace function app.exigir_corte_abierto(p_corte smallint) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.fases f where f.corte_id = p_corte and f.estado = 'abierta') then
    raise exception 'No hay ninguna fase abierta para este corte; no se puede registrar.' using hint = 'fase_no_abierta';
  end if;
end $$;

create or replace function app.exigir(cond boolean, msg text) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if not coalesce(cond, false) then raise exception '%', msg using errcode = '42501'; end if;
end $$;

-- ───────────────────────── Recomendación ─────────────────────────
create or replace function public.registrar_recomendacion(
  p_persona uuid, p_corte smallint, p_recomendacion public.estatus_continuidad, p_comentario text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_pc record; v_amb public.ambito; v_id uuid; v_com text := nullif(trim(p_comentario), '');
begin
  select p.ambito into v_amb from public.personas p where p.id = p_persona;
  perform app.exigir(v_amb is not null, 'Persona inexistente.');
  perform app.exigir(
    app.es(array['subsecretario','admin']::public.rol_app[])
    or (app.rol() = 'eyc' and v_amb = 'mesa' and app.persona_en_mi_comision(p_persona)),
    'No tienes permiso para registrar recomendaciones sobre esta persona.');
  perform app.exigir_corte_abierto(p_corte);

  select * into v_pc from public.v_puntaje_corte where persona_id = p_persona and corte_id = p_corte;
  if (v_pc.semaforo in ('amarillo', 'rojo') or p_recomendacion = 'sustitucion') and v_com is null then
    raise exception 'El comentario es obligatorio con semáforo amarillo o rojo y en toda recomendación de sustitución.';
  end if;
  if exists (select 1 from public.recomendaciones r join public.decisiones d on d.recomendacion_id = r.id
             where r.persona_id = p_persona and r.corte_id = p_corte) then
    raise exception 'Este corte ya tiene una decisión tomada; la recomendación no se puede modificar.';
  end if;

  insert into public.recomendaciones as r (persona_id, corte_id, recomendacion, comentario, puntaje_registrado,
                                           semaforo_registrado, n_evaluaciones, autor_id)
  values (p_persona, p_corte, p_recomendacion, v_com, v_pc.puntaje, v_pc.semaforo, v_pc.n_evaluaciones, auth.uid())
  on conflict (persona_id, corte_id) do update set
    recomendacion = excluded.recomendacion, comentario = excluded.comentario,
    puntaje_registrado = excluded.puntaje_registrado, semaforo_registrado = excluded.semaforo_registrado,
    n_evaluaciones = excluded.n_evaluaciones, autor_id = excluded.autor_id, actualizado_en = now()
  returning r.id into v_id;
  return v_id;
end $$;

-- ───────────────────────── Movimientos de asignación ─────────────────────────
-- Aplica varios movimientos en una sola transacción (permite intercambios).
-- p_movs: [{persona_id, comision_id, cargo_id}]; comision_id null = solo cerrar la asignación.
create or replace function app.mover(p_movs jsonb, p_desde timestamptz, p_motivo public.motivo_asignacion, p_nota text)
returns void language plpgsql security definer set search_path = '' as $$
declare m jsonb; v_abierta public.asignaciones;
begin
  if exists (select 1 from public.fases f where f.es_evento and f.estado = 'cerrada'
             and (p_desde at time zone app.zona())::date between f.inicio and f.fin) then
    raise exception 'La fecha del movimiento cae en una fase cerrada.' using hint = 'fase_no_abierta';
  end if;
  -- 1) Cerrar asignaciones abiertas de las personas involucradas.
  for m in select * from jsonb_array_elements(p_movs) loop
    select * into v_abierta from public.asignaciones a
    where a.persona_id = (m->>'persona_id')::uuid and a.hasta is null;
    if v_abierta.id is not null then
      if v_abierta.desde >= p_desde then
        raise exception 'La asignación actual de la persona empezó después de la fecha del movimiento.';
      end if;
      update public.asignaciones set hasta = p_desde where id = v_abierta.id;
    end if;
  end loop;
  -- 2) Abrir las nuevas.
  for m in select * from jsonb_array_elements(p_movs) loop
    if nullif(m->>'comision_id', '') is not null then
      begin
        insert into public.asignaciones (persona_id, comision_id, cargo_id, desde, motivo, nota)
        values ((m->>'persona_id')::uuid, (m->>'comision_id')::smallint, (m->>'cargo_id')::smallint, p_desde, p_motivo, p_nota);
      exception when exclusion_violation or unique_violation then
        raise exception 'El cargo destino ya está ocupado en esa comisión. Incluye también el movimiento de quien lo ocupa.';
      end;
    end if;
  end loop;
end $$;

create or replace function public.mover_asignaciones(
  p_movs jsonb, p_motivo public.motivo_asignacion default 'rotacion', p_desde timestamptz default now(), p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.exigir(app.es(array['subsecretario','admin']::public.rol_app[]), 'Solo la Subsecretaría puede mover asignaciones.');
  perform app.exigir(p_motivo <> 'sustitucion', 'Las sustituciones se registran desde la decisión de continuidad.');
  if p_motivo = 'rotacion' and not exists (select 1 from public.fases f where f.estado = 'abierta' and f.permite_rotacion) then
    raise exception 'La fase actual no permite rotación.' using hint = 'fase_no_abierta';
  end if;
  perform app.mover(p_movs, p_desde, p_motivo, p_nota);
end $$;

-- ───────────────────────── Sustitución ─────────────────────────
-- Solo procede si la última decisión sobre la persona saliente es "sustitución".
-- p_entrante: {persona_id} o {nombre, correo?} para registrar a la nueva persona.
create or replace function app.sustituir(p_saliente uuid, p_entrante jsonb, p_desde timestamptz, p_nota text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_asig public.asignaciones; v_ent uuid := nullif(p_entrante->>'persona_id', '')::uuid; v_sal public.personas;
begin
  if (select d.decision from public.decisiones d where d.persona_id = p_saliente order by d.creado_en desc limit 1)
     is distinct from 'sustitucion' then
    raise exception 'Solo se puede sustituir a alguien con una decisión de sustitución.';
  end if;
  select * into v_sal from public.personas where id = p_saliente;
  select * into v_asig from public.asignaciones where persona_id = p_saliente and hasta is null;
  if v_asig.id is null then raise exception 'La persona saliente no tiene una asignación abierta.'; end if;

  if v_ent is null then
    insert into public.personas (nombre, ambito, comision_origen_id, cargo_base_id, correo)
    values (trim(p_entrante->>'nombre'), v_sal.ambito, v_asig.comision_id, v_asig.cargo_id, nullif(p_entrante->>'correo', ''))
    returning id into v_ent;
  end if;

  perform app.mover(jsonb_build_array(
    jsonb_build_object('persona_id', p_saliente),
    jsonb_build_object('persona_id', v_ent, 'comision_id', v_asig.comision_id, 'cargo_id', v_asig.cargo_id)
  ), p_desde, 'sustitucion', p_nota);
  update public.personas set activa = false where id = p_saliente;
  return v_ent;
end $$;

create or replace function public.sustituir(
  p_saliente uuid, p_entrante jsonb, p_desde timestamptz default now(), p_nota text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform app.exigir(app.es(array['subsecretario','secretario','admin']::public.rol_app[]), 'Sin permiso para sustituir.');
  return app.sustituir(p_saliente, p_entrante, p_desde, p_nota);
end $$;

-- ───────────────────────── Decisión ─────────────────────────
-- Continúa/seguimiento: la cierra la Subsecretaría. Rojo o sustitución: se eleva al Secretario General.
-- Si se pasa p_sustitucion ({persona_id} | {nombre}), la sustitución se aplica en la misma transacción.
create or replace function public.decidir(
  p_recomendacion uuid, p_decision public.estatus_continuidad, p_comentario text default null, p_sustitucion jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_rec public.recomendaciones; v_elev boolean; v_id uuid; v_com text := nullif(trim(p_comentario), '');
begin
  select * into v_rec from public.recomendaciones where id = p_recomendacion;
  perform app.exigir(v_rec.id is not null, 'Recomendación inexistente.');
  v_elev := v_rec.recomendacion = 'sustitucion' or v_rec.semaforo_registrado = 'rojo';
  if v_elev then
    perform app.exigir(app.es(array['secretario','admin']::public.rol_app[]), 'Este caso está elevado: decide el Secretario General.');
  else
    perform app.exigir(app.es(array['subsecretario','admin']::public.rol_app[]), 'Este caso lo cierra la Subsecretaría.');
  end if;
  perform app.exigir_corte_abierto(v_rec.corte_id);
  if (v_elev or p_decision in ('seguimiento', 'sustitucion')) and v_com is null then
    raise exception 'El comentario es obligatorio en casos elevados y en decisiones de seguimiento o sustitución.';
  end if;
  if exists (select 1 from public.decisiones where recomendacion_id = p_recomendacion) then
    raise exception 'Esta recomendación ya tiene una decisión.';
  end if;

  insert into public.decisiones (recomendacion_id, persona_id, corte_id, decision, comentario, elevada, autor_id)
  values (v_rec.id, v_rec.persona_id, v_rec.corte_id, p_decision, v_com, v_elev, auth.uid())
  returning id into v_id;

  if p_sustitucion is not null then
    perform app.exigir(p_decision = 'sustitucion', 'Solo una decisión de sustitución puede sustituir.');
    perform app.sustituir(v_rec.persona_id, p_sustitucion, now(), v_com);
  end if;
  return v_id;
end $$;

-- ───────────────────────── Vistas de continuidad ─────────────────────────
create view public.v_casos with (security_invoker = true) as
select r.id as recomendacion_id, r.persona_id, p.nombre as persona_nombre, p.ambito, p.activa,
       r.corte_id, c.clave as corte_clave, c.nombre as corte_nombre,
       r.recomendacion, r.comentario as recomendacion_comentario, r.puntaje_registrado, r.semaforo_registrado,
       r.n_evaluaciones, r.autor_id as recomendacion_autor, pr.nombre as recomendacion_autor_nombre,
       r.actualizado_en as recomendacion_fecha,
       (r.recomendacion = 'sustitucion' or r.semaforo_registrado = 'rojo') as elevada,
       d.id as decision_id, d.decision, d.comentario as decision_comentario, d.autor_id as decision_autor,
       pd.nombre as decision_autor_nombre, d.creado_en as decision_fecha,
       d.id is null as pendiente
from public.recomendaciones r
join public.personas p on p.id = r.persona_id
join public.cortes c on c.id = r.corte_id
left join public.perfiles pr on pr.id = r.autor_id
left join public.decisiones d on d.recomendacion_id = r.id
left join public.perfiles pd on pd.id = d.autor_id;

-- Estatus de continuidad = la última decisión tomada; sin decisiones → no evaluado.
create view public.v_continuidad_actual with (security_invoker = true) as
select p.id as persona_id, p.nombre, p.ambito, p.activa,
       coalesce(ult.decision, 'no_evaluado'::public.estatus_continuidad) as estatus,
       ult.creado_en as decidido_en, ult.corte_id,
       exists (select 1 from public.recomendaciones r left join public.decisiones d on d.recomendacion_id = r.id
               where r.persona_id = p.id and d.id is null) as tiene_pendiente
from public.personas p
left join lateral (
  select d.decision, d.creado_en, d.corte_id from public.decisiones d
  where d.persona_id = p.id order by d.creado_en desc limit 1
) ult on true;

-- Cobertura por comisión y fase de evaluación: jornadas/actividades esperadas vs. evaluaciones.
create view public.v_cobertura with (security_invoker = true) as
with fe as (
  select f.* from public.fases f where f.tipo = 'evaluacion'
), esperadas_evento as (
  select f.id as fase_id, a.comision_id, count(distinct (a.persona_id, g.dia))::int as n
  from fe f
  cross join lateral generate_series(f.inicio, least(f.fin, app.hoy()), interval '1 day') g(dia)
  join public.asignaciones a
    on tstzrange(a.desde, a.hasta) && tstzrange((g.dia::date::timestamp) at time zone app.zona(),
                                                ((g.dia::date + 1)::timestamp) at time zone app.zona())
  join public.personas p on p.id = a.persona_id and p.ambito = 'mesa'
  where f.es_evento
  group by f.id, a.comision_id
), esperadas_prev as (
  select f.id as fase_id, co.id as comision_id,
         (select count(*) from public.actividades ac
          where ac.fase_id = f.id and ac.ambito = 'mesa' and (ac.comision_id is null or ac.comision_id = co.id))::int
         * (select count(*) from public.asignaciones a join public.personas p on p.id = a.persona_id
            where a.comision_id = co.id and a.hasta is null and p.ambito = 'mesa')::int as n
  from fe f cross join public.comisiones co
  where not f.es_evento
), hechas as (
  select e.fase_id, a.comision_id,
         count(*) filter (where e.estado = 'completa')::int as completas,
         count(*) filter (where e.estado = 'borrador')::int as borradores
  from public.evaluaciones e join public.asignaciones a on a.id = e.asignacion_id
  where e.ambito = 'mesa'
  group by e.fase_id, a.comision_id
)
select co.id as comision_id, co.clave as comision_clave, co.sigla as comision_sigla, co.nombre as comision_nombre,
       f.id as fase_id, f.nombre as fase_nombre, f.estado as fase_estado,
       coalesce(ee.n, ep.n, 0) as esperadas,
       coalesce(h.completas, 0) as completas,
       coalesce(h.borradores, 0) as borradores,
       case when coalesce(ee.n, ep.n, 0) > 0
            then round(100.0 * coalesce(h.completas, 0) / coalesce(ee.n, ep.n), 1) end as porcentaje
from public.comisiones co
cross join fe f
left join esperadas_evento ee on ee.fase_id = f.id and ee.comision_id = co.id
left join esperadas_prev ep on ep.fase_id = f.id and ep.comision_id = co.id
left join hechas h on h.fase_id = f.id and h.comision_id = co.id
where co.activa;

-- ───────────────────────── Historial de criterios ─────────────────────────
create or replace function app.tg_criterio_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.texto, new.favorable, new.activo) is distinct from (old.texto, old.favorable, old.activo) then
    insert into public.criterios_historial (criterio_id, version, texto, favorable, activo, autor)
    values (old.id, old.version, old.texto, old.favorable, old.activo, auth.uid());
    new.version := old.version + 1;
    new.actualizado_en := now();
    new.actualizado_por := auth.uid();
  end if;
  return new;
end $$;
create trigger criterio_version before update on public.criterios
  for each row execute function app.tg_criterio_version();

-- ───────────────────────── Auditoría ─────────────────────────
create or replace function app.tg_auditar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_antes jsonb; v_despues jsonb; v_reg text;
begin
  if tg_op <> 'INSERT' then v_antes := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_despues := to_jsonb(new); end if;
  v_reg := coalesce(v_despues, v_antes) ->> coalesce(tg_argv[0], 'id');
  if tg_op = 'UPDATE' and v_antes = v_despues then return null; end if;
  insert into public.auditoria (tabla, registro, accion, antes, despues)
  values (tg_table_name, v_reg, lower(tg_op), v_antes, v_despues);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['evaluaciones','recomendaciones','decisiones','asignaciones','personas','actividades',
                           'fases','cortes','config','criterios','perfiles','comisiones','cargos'] loop
    execute format('create trigger auditar after insert or update or delete on public.%I
                    for each row execute function app.tg_auditar()', t);
  end loop;
end $$;
create trigger auditar after insert or update or delete on public.pesos_dimension
  for each row execute function app.tg_auditar('dimension_id');
create trigger auditar after insert or update or delete on public.respuestas
  for each row execute function app.tg_auditar('evaluacion_id');
