-- 023 · Evaluación directa a los integrantes de EyC.
--   Hasta ahora toda evaluación colgaba de una actividad o de una jornada del evento.
--   La Subsecretaría necesita evaluar a un integrante de EyC sin esa dependencia: la evaluación «directa» no lleva
--   actividad ni jornada; la fase (y con ella el corte) es la fase de evaluación abierta. Solo aplica a personas de EyC.
--   No toca ningún registro existente: las evaluaciones previas siguen cumpliendo la regla nueva.

-- Una evaluación sigue sin poder tener actividad y jornada a la vez; ahora puede no tener ninguna (directa).
alter table public.evaluaciones drop constraint evaluaciones_check;
alter table public.evaluaciones add constraint evaluaciones_referencia_chk
  check (actividad_id is null or fecha_jornada is null);

-- Una evaluación directa por persona y corte (se edita, no se duplica).
create unique index evaluaciones_directa_uq on public.evaluaciones (persona_id, corte_id)
  where actividad_id is null and fecha_jornada is null;

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
  elsif new.fecha_jornada is not null then
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
  else
    -- Evaluación directa: solo a integrantes de EyC, en la fase de evaluación que esté abierta.
    if v_amb <> 'eyc' then
      raise exception 'Una evaluación sin actividad ni jornada solo se permite a integrantes de EyC.';
    end if;
    select * into v_fase from public.fases f where f.tipo = 'evaluacion' and f.estado = 'abierta' order by f.orden limit 1;
    if v_fase.id is null then
      raise exception 'No hay una fase de evaluación abierta: ábrela en Configuración para evaluar.' using errcode = 'P0001', hint = 'fase_no_abierta';
    end if;
    select a.id into v_asig from public.asignaciones a where a.persona_id = new.persona_id and a.hasta is null;
  end if;

  if v_fase.tipo <> 'evaluacion' then raise exception 'La fase "%" no admite evaluaciones.', v_fase.nombre; end if;
  new.fase_id := v_fase.id;
  new.corte_id := v_fase.corte_id;
  new.asignacion_id := v_asig;
  new.estado := 'borrador';   -- siempre nace borrador; se completa con validación
  new.completada_en := null;
  return new;
end $$;

-- La fecha de una evaluación directa es el día en que se registró (mismas columnas que antes).
create or replace view public.v_evaluaciones with (security_invoker = true) as
select e.id as evaluacion_id, e.persona_id, p.nombre as persona_nombre, e.ambito,
       e.asignacion_id, a.comision_id, co.sigla as comision_sigla, co.nombre as comision_nombre,
       ca.nombre as cargo_nombre,
       e.actividad_id, ac.nombre as actividad_nombre, ac.tipo as actividad_tipo,
       coalesce(ac.fecha, e.fecha_jornada, (e.creado_en at time zone app.zona())::date) as fecha, e.fecha_jornada,
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
