-- 004 · Actividades, evaluaciones, respuestas y reglas de escritura (fase abierta, comentario obligatorio).

insert into public.config (clave, valor, descripcion) values
  ('zona_horaria', '"America/Santo_Domingo"', 'Zona horaria del evento: define qué es "hoy" y los límites de cada jornada.');

create or replace function app.zona() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select c.valor #>> '{}' from public.config c where c.clave = 'zona_horaria'), 'UTC')
$$;

create or replace function app.hoy() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone app.zona())::date
$$;

-- ¿La fase está abierta? Toda escritura de un período pasa por aquí.
create or replace function app.exigir_fase_abierta(p_fase smallint) returns void
language plpgsql stable security definer set search_path = '' as $$
declare v public.fases;
begin
  select * into v from public.fases where id = p_fase;
  if v.id is null then
    raise exception 'Fase inexistente' using errcode = 'P0001';
  end if;
  if v.estado <> 'abierta' then
    raise exception 'La fase "%" está %; no se puede escribir en ella.', v.nombre, v.estado
      using errcode = 'P0001', hint = 'fase_no_abierta';
  end if;
end $$;

-- ───────────────────────── Tablas ─────────────────────────
create table public.actividades (
  id          uuid primary key default gen_random_uuid(),
  fase_id     smallint not null references public.fases(id),
  comision_id smallint references public.comisiones(id),   -- null = actividad general (todas las comisiones)
  ambito      public.ambito not null default 'mesa',
  tipo        public.tipo_actividad not null,
  nombre      text not null check (length(trim(nombre)) > 1),
  fecha       date not null,
  cerrada     boolean not null default false,
  creado_por  uuid default auth.uid() references public.perfiles(id),
  creado_en   timestamptz not null default now()
);
create index on public.actividades (fase_id);
create index on public.actividades (comision_id);
create index on public.actividades (creado_por);

create table public.evaluaciones (
  id                   uuid primary key default gen_random_uuid(),
  persona_id           uuid not null references public.personas(id),
  asignacion_id        uuid references public.asignaciones(id),
  actividad_id         uuid references public.actividades(id),
  fecha_jornada        date,
  fase_id              smallint not null references public.fases(id),
  corte_id             smallint not null references public.cortes(id),
  ambito               public.ambito not null,
  evaluador_id         uuid references public.perfiles(id),
  estado               public.estado_evaluacion not null default 'borrador',
  comentario_general   text,
  observacion_rotacion text,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  completada_en        timestamptz,
  check ((actividad_id is null) <> (fecha_jornada is null))
);
create unique index evaluaciones_actividad_uq on public.evaluaciones (persona_id, actividad_id) where actividad_id is not null;
create unique index evaluaciones_jornada_uq   on public.evaluaciones (persona_id, fecha_jornada) where fecha_jornada is not null;
create index on public.evaluaciones (asignacion_id);
create index on public.evaluaciones (actividad_id);
create index on public.evaluaciones (fase_id);
create index on public.evaluaciones (corte_id, persona_id);
create index on public.evaluaciones (evaluador_id);

create table public.respuestas (
  evaluacion_id uuid not null references public.evaluaciones(id) on delete cascade,
  criterio_id   integer not null references public.criterios(id),
  respuesta     public.respuesta_criterio not null,
  comentario    text,
  -- Instantánea del criterio al responder: editar el criterio no altera evaluaciones hechas.
  dimension_id  smallint not null references public.dimensiones(id),
  favorable     public.respuesta_criterio not null,
  texto         text not null,
  primary key (evaluacion_id, criterio_id)
);
create index on public.respuestas (criterio_id);
create index on public.respuestas (dimension_id);

create table public.evaluacion_dimensiones (
  evaluacion_id uuid not null references public.evaluaciones(id) on delete cascade,
  dimension_id  smallint not null references public.dimensiones(id),
  no_observado  boolean not null default false,
  comentario    text,
  primary key (evaluacion_id, dimension_id)
);
create index on public.evaluacion_dimensiones (dimension_id);

-- ───────────────────────── Asignación dominante de una jornada ─────────────────────────
-- La asignación que estuvo vigente más tiempo ese día (en la zona del evento).
create or replace function app.asignacion_dominante(p_persona uuid, p_fecha date)
returns table (asignacion_id uuid, total integer)
language sql stable security definer set search_path = '' as $$
  with dia as (
    select tstzrange((p_fecha::timestamp) at time zone app.zona(),
                     ((p_fecha + 1)::timestamp) at time zone app.zona()) as r
  ), cand as (
    select a.id,
           upper(d.r * tstzrange(a.desde, a.hasta)) - lower(d.r * tstzrange(a.desde, a.hasta)) as dur
    from public.asignaciones a, dia d
    where a.persona_id = p_persona and tstzrange(a.desde, a.hasta) && d.r
  )
  select c.id, (count(*) over ())::int from cand c order by c.dur desc, c.id limit 1
$$;

-- ───────────────────────── Triggers de evaluación ─────────────────────────
create or replace function app.tg_evaluacion_preparar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_act  public.actividades;
  v_fase public.fases;
  v_amb  public.ambito;
  v_asig uuid;
  v_n    integer;
begin
  if tg_op = 'UPDATE' then
    if new.persona_id <> old.persona_id or new.actividad_id is distinct from old.actividad_id
       or new.fecha_jornada is distinct from old.fecha_jornada or new.fase_id <> old.fase_id
       or new.corte_id <> old.corte_id or new.asignacion_id is distinct from old.asignacion_id
       or new.evaluador_id is distinct from old.evaluador_id or new.ambito <> old.ambito then
      raise exception 'Persona, actividad, jornada, fase y evaluador de una evaluación no se pueden cambiar.';
    end if;
    new.actualizado_en := now();
    if new.estado = 'completa' and old.estado <> 'completa' then new.completada_en := now(); end if;
    if new.estado = 'borrador' then new.completada_en := null; end if;
    return new;
  end if;

  select p.ambito into v_amb from public.personas p where p.id = new.persona_id and p.activa;
  if v_amb is null then raise exception 'La persona no existe o está inactiva.'; end if;
  new.ambito := v_amb;
  new.evaluador_id := coalesce(auth.uid(), new.evaluador_id);

  if new.actividad_id is not null then
    select * into v_act from public.actividades where id = new.actividad_id;
    if v_act.cerrada then raise exception 'La actividad "%" está cerrada.', v_act.nombre; end if;
    if v_act.ambito <> v_amb then raise exception 'La actividad no corresponde al ámbito de la persona.'; end if;
    select * into v_fase from public.fases where id = v_act.fase_id;
    select d.asignacion_id, d.total into v_asig, v_n from app.asignacion_dominante(new.persona_id, v_act.fecha) d;
    if v_asig is null then
      -- Antes del evento no hay rotación: si la asignación se registró después de la actividad, se usa la vigente.
      select a.id into v_asig from public.asignaciones a where a.persona_id = new.persona_id and a.hasta is null;
      if v_asig is not null then
        new.observacion_rotacion := 'Sin asignación registrada en la fecha de la actividad; se usó la vigente.';
      end if;
    end if;
    if v_act.comision_id is not null and v_asig is not null and not exists (
      select 1 from public.asignaciones a where a.id = v_asig and a.comision_id = v_act.comision_id) then
      raise exception 'La persona no estaba asignada a la comisión de la actividad.';
    end if;
  else
    select * into v_fase from public.fases f
    where f.es_evento and f.tipo = 'evaluacion' and new.fecha_jornada between f.inicio and f.fin
    order by f.orden limit 1;
    if v_fase.id is null then raise exception 'La fecha % no corresponde a ninguna jornada del evento.', new.fecha_jornada; end if;
    if new.fecha_jornada > app.hoy() then raise exception 'No se puede evaluar una jornada futura.'; end if;
    select d.asignacion_id, d.total into v_asig, v_n from app.asignacion_dominante(new.persona_id, new.fecha_jornada) d;
    if v_asig is null then raise exception 'La persona no tenía asignación el %.', new.fecha_jornada; end if;
    if v_n > 1 then
      new.observacion_rotacion := format('Rotó durante la jornada (%s asignaciones); se evaluó contra la de mayor permanencia.', v_n);
    end if;
  end if;

  if v_fase.tipo <> 'evaluacion' then raise exception 'La fase "%" no admite evaluaciones.', v_fase.nombre; end if;
  new.fase_id := v_fase.id;
  new.corte_id := v_fase.corte_id;
  new.asignacion_id := v_asig;
  new.estado := 'borrador';   -- siempre nace borrador; se completa con validación
  new.completada_en := null;
  return new;
end $$;

create trigger evaluacion_preparar before insert or update on public.evaluaciones
  for each row execute function app.tg_evaluacion_preparar();

-- Bloqueo por fase (corre después de preparar, que fija fase_id).
create or replace function app.tg_evaluacion_fase() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.exigir_fase_abierta(case when tg_op = 'DELETE' then old.fase_id else new.fase_id end);
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger evaluacion_zz_fase before insert or update or delete on public.evaluaciones
  for each row execute function app.tg_evaluacion_fase();

create or replace function app.tg_hijo_evaluacion_fase() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_eval uuid := case when tg_op = 'DELETE' then old.evaluacion_id else new.evaluacion_id end;
        v_fase smallint;
begin
  select e.fase_id into v_fase from public.evaluaciones e where e.id = v_eval;
  if v_fase is not null then perform app.exigir_fase_abierta(v_fase); end if;  -- null: borrado en cascada
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger respuesta_fase before insert or update or delete on public.respuestas
  for each row execute function app.tg_hijo_evaluacion_fase();
create trigger evaluacion_dimension_fase before insert or update or delete on public.evaluacion_dimensiones
  for each row execute function app.tg_hijo_evaluacion_fase();

create or replace function app.tg_actividad_fase() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform app.exigir_fase_abierta(old.fase_id); end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform app.exigir_fase_abierta(new.fase_id);
    if exists (select 1 from public.fases f where f.id = new.fase_id and (f.tipo <> 'evaluacion' or f.es_evento)) then
      raise exception 'Las actividades solo existen en fases de evaluación previas al evento.';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger actividad_fase before insert or update or delete on public.actividades
  for each row execute function app.tg_actividad_fase();

-- Instantánea del criterio en cada respuesta.
create or replace function app.tg_respuesta_snapshot() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_c public.criterios; v_amb public.ambito;
begin
  if tg_op = 'UPDATE' and new.criterio_id = old.criterio_id then
    new.dimension_id := old.dimension_id; new.favorable := old.favorable; new.texto := old.texto;
    return new;
  end if;
  select * into v_c from public.criterios where id = new.criterio_id;
  select e.ambito into v_amb from public.evaluaciones e where e.id = new.evaluacion_id;
  if v_c.ambito <> v_amb then raise exception 'El criterio % no corresponde al ámbito de la evaluación.', v_c.codigo; end if;
  new.dimension_id := v_c.dimension_id; new.favorable := v_c.favorable; new.texto := v_c.texto;
  return new;
end $$;
create trigger respuesta_snapshot before insert or update on public.respuestas
  for each row execute function app.tg_respuesta_snapshot();

-- ───────────────────────── Qué falta para completar ─────────────────────────
create or replace function public.faltantes_evaluacion(p_evaluacion uuid)
returns table (dimension text, criterio text, motivo text)
language sql stable security invoker set search_path = '' as $$
  with e as (select * from public.evaluaciones where id = p_evaluacion),
  dims_no as (select ed.dimension_id from public.evaluacion_dimensiones ed
              where ed.evaluacion_id = p_evaluacion and ed.no_observado)
  -- Criterios activos sin respuesta (salvo dimensión marcada N/O).
  select d.clave::text, c.codigo, 'Falta responder'
  from e join public.criterios c on c.ambito = e.ambito and c.activo
  join public.dimensiones d on d.id = c.dimension_id
  where c.dimension_id not in (select dimension_id from dims_no)
    and not exists (select 1 from public.respuestas r where r.evaluacion_id = e.id and r.criterio_id = c.id)
  union all
  -- Respuesta desfavorable sin comentario.
  select d.clave::text, c.codigo, 'Falta comentario: la respuesta es desfavorable'
  from public.respuestas r
  join public.criterios c on c.id = r.criterio_id
  join public.dimensiones d on d.id = r.dimension_id
  where r.evaluacion_id = p_evaluacion
    and r.dimension_id not in (select dimension_id from dims_no)
    and r.respuesta <> 'no_observado' and r.respuesta <> r.favorable
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

create or replace function app.validar_completa(p_evaluacion uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_txt text;
begin
  select string_agg(coalesce(f.criterio || ': ', '') || f.motivo, '; ') into v_txt
  from public.faltantes_evaluacion(p_evaluacion) f;
  if v_txt is not null then
    raise exception 'La evaluación no se puede marcar como completa. %', v_txt using hint = 'evaluacion_incompleta';
  end if;
end $$;

create or replace function app.tg_evaluacion_completa() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estado = 'completa' then perform app.validar_completa(new.id); end if;
  return null;
end $$;
create constraint trigger evaluacion_completa_valida after update on public.evaluaciones
  deferrable initially deferred for each row execute function app.tg_evaluacion_completa();

create or replace function app.tg_hijo_completa() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := case when tg_op = 'DELETE' then old.evaluacion_id else new.evaluacion_id end;
begin
  if exists (select 1 from public.evaluaciones e where e.id = v_id and e.estado = 'completa') then
    perform app.validar_completa(v_id);
  end if;
  return null;
end $$;
create constraint trigger respuesta_completa_valida after insert or update or delete on public.respuestas
  deferrable initially deferred for each row execute function app.tg_hijo_completa();
create constraint trigger dimension_completa_valida after insert or update or delete on public.evaluacion_dimensiones
  deferrable initially deferred for each row execute function app.tg_hijo_completa();

-- ───────────────────────── Guardado atómico (lo usa el frontend) ─────────────────────────
-- p: { id?, persona_id, actividad_id?, fecha_jornada?, comentario_general?, estado,
--      respuestas: [{criterio_id, respuesta, comentario}], dimensiones_no_observadas: [dimension_id] }
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

  insert into public.respuestas (evaluacion_id, criterio_id, respuesta, comentario, dimension_id, favorable, texto)
  select v_id, (x->>'criterio_id')::int, (x->>'respuesta')::public.respuesta_criterio, nullif(trim(x->>'comentario'), ''),
         0, 'si', ''   -- instantánea la fija el trigger
  from jsonb_array_elements(coalesce(p->'respuestas', '[]')) x
  on conflict (evaluacion_id, criterio_id) do update
    set respuesta = excluded.respuesta, comentario = excluded.comentario
    where respuestas.respuesta is distinct from excluded.respuesta or respuestas.comentario is distinct from excluded.comentario;

  insert into public.evaluacion_dimensiones (evaluacion_id, dimension_id, no_observado)
  select v_id, d.id, d.id in (select (x #>> '{}')::smallint from jsonb_array_elements(coalesce(p->'dimensiones_no_observadas', '[]')) x)
  from public.dimensiones d
  on conflict (evaluacion_id, dimension_id) do update set no_observado = excluded.no_observado
    where evaluacion_dimensiones.no_observado is distinct from excluded.no_observado;

  update public.evaluaciones set estado = v_estado where id = v_id and estado is distinct from v_estado;
  if v_estado = 'completa' then perform app.validar_completa(v_id); end if;
  return v_id;
end $$;
