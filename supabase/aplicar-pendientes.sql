-- Migraciones pendientes (013 a 016) en un solo bloque, para pegar en Supabase → SQL Editor → Run.
-- Equivale a aplicar los archivos de supabase/migrations/ en orden. Se puede pegar completo.
-- La 014 se detiene sola si ya hay evaluaciones de mesa guardadas (para no cambiar puntajes sin avisar).

-- ═══════════════ 20261023000013_sesiones_y_cortes.sql ═══════════════
-- 013 · El evento va del 14 al 19 de noviembre de 2026, pero las sesiones de trabajo empiezan el lunes 16.
--       El 14 y el 15 no hay sesiones: los cortes cuentan desde el primer día de sesiones.
--         Corte 2 = sesiones del 16 y el 17 · Evaluación Final = sesiones del 18 y el 19.
--       Los días 2 y 3 de sesiones (17 y 18) se rota.

insert into public.config (clave, valor, descripcion) values
  ('sesiones_inicio', '"2026-11-16"', 'Fecha del Día 1 de sesiones de trabajo (lunes). El 14 y el 15 no hay sesiones.'),
  ('sesiones_dias', '3', 'Días de sesiones con rotación a partir del Día 2 (Día 1 = comisión original).'),
  ('comisiones_sin_rotacion', '["cij"]', 'Comisiones cuya mesa no rota (claves). EyC y aprendices nunca rotan.')
on conflict (clave) do nothing;

-- Las fechas del evento ya están confirmadas.
update public.config set provisional = false where clave in ('evento_inicio', 'evento_dias');
update public.config set valor = '"2026-11-14"', descripcion = 'Primer día del evento (sábado 14). Las sesiones empiezan el lunes 16.' where clave = 'evento_inicio';
update public.config set valor = '6', descripcion = 'Días del evento (14 al 19 de noviembre).' where clave = 'evento_dias';

-- Fases y cortes: se cuentan días de sesiones, no días del evento.
update public.cortes set proposito = 'Desempeño de los días 1 y 2 de sesiones (16 y 17 de noviembre)' where clave = 'c2';
update public.cortes set proposito = 'Desempeño de los días 3 y 4 de sesiones (18 y 19 de noviembre)' where clave = 'final';
update public.fases set nombre = 'Evento — Días 1 y 2', inicio = '2026-11-16', fin = '2026-11-17' where clave = 'evento_d1_2';
update public.fases set inicio = '2026-11-17', fin = '2026-11-17' where clave = 'corte2';
update public.fases set nombre = 'Evento — Días 3 y 4', inicio = '2026-11-18', fin = '2026-11-19' where clave = 'evento_d3_6';
update public.fases set inicio = '2026-11-19', fin = null where clave = 'cierre';

-- Reprogramar el evento respeta que las sesiones empiezan dos días después del inicio del evento
-- (o en la fecha guardada en config.sesiones_inicio).
create or replace function public.reprogramar_evento(p_inicio date, p_dias integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_ses date := coalesce((select (c.valor #>> '{}')::date from public.config c where c.clave = 'sesiones_inicio'), p_inicio + 2);
begin
  if p_dias < 3 then raise exception 'El evento debe durar al menos 3 días.'; end if;
  if v_ses < p_inicio or v_ses > p_inicio + p_dias - 1 then v_ses := p_inicio; end if;
  update public.config set valor = to_jsonb(p_inicio::text), provisional = false where clave = 'evento_inicio';
  update public.config set valor = to_jsonb(p_dias), provisional = false where clave = 'evento_dias';
  update public.fases set inicio = v_ses,                fin = v_ses + 1             where clave = 'evento_d1_2';
  update public.fases set inicio = v_ses + 1,            fin = v_ses + 1             where clave = 'corte2';
  update public.fases set inicio = v_ses + 2,            fin = p_inicio + p_dias - 1 where clave = 'evento_d3_6';
  update public.fases set inicio = p_inicio + p_dias - 1, fin = null                 where clave = 'cierre';
end $$;

-- ═══════════════ 20261023000014_rubrica_notas.sql ═══════════════
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

-- ═══════════════ 20261023000015_formularios.sql ═══════════════
-- 015 · Formularios sin cuenta.
--   Cualquier cuenta con rol crea formularios (texto, párrafo, número, fecha, opción única, casillas, lista, escala, sí/no).
--   Cualquier persona los responde sin cuenta desde un enlace público: elige quién es (delegado, mesa, aprendiz, EyC…),
--   la comisión y la sesión o taller, y responde. Quien lo creó (y la Subsecretaría, la Secretaría General y la administración)
--   ve los resultados. `anon` NO tiene acceso a ninguna tabla: solo puede ejecutar las dos funciones públicas de abajo.

create table public.formularios (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique default substr(md5(gen_random_uuid()::text), 1, 10),   -- enlace público: /f/<codigo>
  titulo          text not null check (length(trim(titulo)) > 1),
  descripcion     text,
  roles           text[] not null default '{}',     -- opciones de «¿quién eres?»; vacío = no se pregunta
  pide_comision   boolean not null default true,
  pide_referencia boolean not null default true,    -- sesión o taller (texto libre)
  activo          boolean not null default true,
  creado_por      uuid references public.perfiles(id) default auth.uid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);
create index on public.formularios (creado_por);

create table public.formulario_campos (
  id            uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references public.formularios(id) on delete cascade,
  orden         smallint not null default 0,
  tipo          text not null check (tipo in ('texto', 'parrafo', 'numero', 'fecha', 'radio', 'checkbox', 'lista', 'escala', 'si_no')),
  etiqueta      text not null check (length(trim(etiqueta)) > 0),
  ayuda         text,
  obligatorio   boolean not null default false,
  opciones      jsonb not null default '[]' check (jsonb_typeof(opciones) = 'array'),
  escala_min    smallint,
  escala_max    smallint,
  roles         text[] not null default '{}',       -- vacío = lo responden todos; si no, solo esos roles
  activo        boolean not null default true,      -- un campo con respuestas no se borra: se desactiva
  creado_en     timestamptz not null default now(),
  check (tipo not in ('radio', 'checkbox', 'lista') or jsonb_array_length(opciones) >= 1),
  check (escala_min is null or escala_max is null or escala_max > escala_min)
);
create index on public.formulario_campos (formulario_id, orden);

create table public.formulario_envios (
  id            uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references public.formularios(id) on delete cascade,
  rol           text,
  comision_id   smallint references public.comisiones(id),
  referencia    text,
  huella        text not null,                      -- huella del dispositivo (solo para limitar envíos repetidos)
  creado_en     timestamptz not null default now()
);
create index on public.formulario_envios (formulario_id, creado_en);
create index on public.formulario_envios (formulario_id, huella, creado_en);
create index on public.formulario_envios (comision_id);

create table public.formulario_respuestas (
  envio_id uuid not null references public.formulario_envios(id) on delete cascade,
  campo_id uuid not null references public.formulario_campos(id) on delete restrict,
  valor    jsonb not null,
  primary key (envio_id, campo_id)
);
create index on public.formulario_respuestas (campo_id);

-- ───────────── Permisos ─────────────
create or replace function app.puedo_gestionar_formulario(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.formularios f
                 where f.id = p and (f.creado_por = auth.uid() or app.es(array['subsecretario', 'admin']::public.rol_app[])))
$$;
create or replace function app.puedo_ver_formulario(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.formularios f
                 where f.id = p and (f.creado_por = auth.uid() or app.es(array['subsecretario', 'secretario', 'admin']::public.rol_app[])))
$$;
create or replace function app.puedo_ver_envio(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.formulario_envios e where e.id = p and app.puedo_ver_formulario(e.formulario_id))
$$;

alter table public.formularios          enable row level security;
alter table public.formulario_campos    enable row level security;
alter table public.formulario_envios    enable row level security;
alter table public.formulario_respuestas enable row level security;

revoke all on public.formularios, public.formulario_campos, public.formulario_envios, public.formulario_respuestas from anon, public;
grant select, insert, update, delete on public.formularios, public.formulario_campos to authenticated;
grant select, delete on public.formulario_envios, public.formulario_respuestas to authenticated;

-- Las políticas de `formularios` miran la propia fila (no consultan la tabla), para que el creador pueda leer lo que acaba de insertar.
create policy lectura on public.formularios for select to authenticated
  using (creado_por = (select auth.uid()) or (select app.es(array['subsecretario', 'secretario', 'admin']::public.rol_app[])));
create policy alta    on public.formularios for insert to authenticated
  with check ((select app.rol()) is not null and creado_por = (select auth.uid()));
create policy edicion on public.formularios for update to authenticated
  using (creado_por = (select auth.uid()) or (select app.es(array['subsecretario', 'admin']::public.rol_app[])))
  with check (creado_por = (select auth.uid()) or (select app.es(array['subsecretario', 'admin']::public.rol_app[])));
create policy borrado on public.formularios for delete to authenticated
  using (creado_por = (select auth.uid()) or (select app.es(array['subsecretario', 'admin']::public.rol_app[])));

create policy lectura on public.formulario_campos for select to authenticated using ((select app.puedo_ver_formulario(formulario_id)));
create policy alta    on public.formulario_campos for insert to authenticated with check ((select app.puedo_gestionar_formulario(formulario_id)));
create policy edicion on public.formulario_campos for update to authenticated
  using ((select app.puedo_gestionar_formulario(formulario_id))) with check ((select app.puedo_gestionar_formulario(formulario_id)));
create policy borrado on public.formulario_campos for delete to authenticated using ((select app.puedo_gestionar_formulario(formulario_id)));

create policy lectura on public.formulario_envios for select to authenticated using ((select app.puedo_ver_formulario(formulario_id)));
create policy borrado on public.formulario_envios for delete to authenticated using ((select app.puedo_gestionar_formulario(formulario_id)));
create policy lectura on public.formulario_respuestas for select to authenticated using ((select app.puedo_ver_envio(envio_id)));

create or replace function app.tg_formulario_actualizado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin new.actualizado_en := now(); return new; end $$;
create trigger actualizado before update on public.formularios for each row execute function app.tg_formulario_actualizado();

create trigger auditar after insert or update or delete on public.formularios       for each row execute function app.tg_auditar();
create trigger auditar after insert or update or delete on public.formulario_campos for each row execute function app.tg_auditar();

-- ───────────── Funciones públicas (las únicas que `anon` puede ejecutar) ─────────────
-- Devuelve la definición de un formulario activo: nada más que lo necesario para dibujarlo.
create or replace function public.formulario_publico(p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare f public.formularios;
begin
  select * into f from public.formularios where codigo = lower(trim(p_codigo)) and activo;
  if f.id is null then raise exception 'Este formulario no está disponible.' using errcode = 'P0001'; end if;
  return jsonb_build_object(
    'titulo', f.titulo, 'descripcion', f.descripcion, 'roles', to_jsonb(f.roles),
    'pide_comision', f.pide_comision, 'pide_referencia', f.pide_referencia,
    'comisiones', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'sigla', coalesce(c.sigla, upper(c.clave)), 'nombre', c.nombre) order by c.orden), '[]')
                   from public.comisiones c where c.activa),
    'campos', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', k.id, 'tipo', k.tipo, 'etiqueta', k.etiqueta, 'ayuda', k.ayuda, 'obligatorio', k.obligatorio,
                  'opciones', k.opciones, 'escala_min', coalesce(k.escala_min, 1), 'escala_max', coalesce(k.escala_max, 5), 'roles', to_jsonb(k.roles))
                  order by k.orden, k.creado_en), '[]')
               from public.formulario_campos k where k.formulario_id = f.id and k.activo));
end $$;

-- Recibe una respuesta: valida todo en el servidor, limita envíos repetidos y solo escribe (no devuelve datos).
-- p: { rol, comision_id, referencia, respuestas: { "<campo_id>": valor }, web (trampa para bots: debe venir vacío) }
create or replace function public.formulario_enviar(p_codigo text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  f public.formularios; k public.formulario_campos; v jsonb; r jsonb := coalesce(p -> 'respuestas', '{}'::jsonb);
  v_rol text := nullif(trim(p ->> 'rol'), ''); v_ref text := nullif(trim(p ->> 'referencia'), '');
  v_com smallint := nullif(p ->> 'comision_id', '')::smallint;
  v_hdr jsonb; v_huella text; v_envio uuid; n int;
begin
  if coalesce(p ->> 'web', '') <> '' then return; end if;                       -- trampa para bots: se ignora en silencio
  select * into f from public.formularios where codigo = lower(trim(p_codigo)) and activo;
  if f.id is null then raise exception 'Este formulario no está disponible.' using errcode = 'P0001'; end if;
  if cardinality(f.roles) > 0 and (v_rol is null or v_rol <> all (f.roles)) then
    raise exception 'Elige quién eres.' using errcode = 'P0001';
  end if;
  if f.pide_comision and not exists (select 1 from public.comisiones c where c.id = v_com and c.activa) then
    raise exception 'Elige la comisión.' using errcode = 'P0001';
  end if;
  if f.pide_referencia and v_ref is null then raise exception 'Escribe la sesión o el taller.' using errcode = 'P0001'; end if;
  if length(coalesce(v_ref, '')) > 120 then raise exception 'La sesión o el taller es demasiado largo.' using errcode = 'P0001'; end if;

  -- Límite: pocas respuestas seguidas desde el mismo dispositivo.
  v_hdr := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_huella := md5(coalesce(v_hdr ->> 'x-forwarded-for', '') || '|' || coalesce(v_hdr ->> 'user-agent', ''));
  select count(*) into n from public.formulario_envios e
   where e.formulario_id = f.id and e.huella = v_huella and e.creado_en > now() - interval '10 minutes';
  if n >= 5 then raise exception 'Enviaste varias respuestas seguidas. Espera unos minutos y vuelve a intentarlo.' using errcode = 'P0001'; end if;

  insert into public.formulario_envios (formulario_id, rol, comision_id, referencia, huella)
  values (f.id, v_rol, case when f.pide_comision then v_com end, v_ref, v_huella) returning id into v_envio;

  for k in select * from public.formulario_campos c
           where c.formulario_id = f.id and c.activo and (cardinality(c.roles) = 0 or v_rol = any (c.roles)) order by c.orden, c.creado_en loop
    v := r -> k.id::text;
    if v is null or v = 'null'::jsonb or v = '""'::jsonb or v = '[]'::jsonb then
      if k.obligatorio then raise exception 'Falta responder: %', k.etiqueta using errcode = 'P0001'; end if;
      continue;
    end if;
    case k.tipo
      when 'texto' then
        if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 500 then raise exception 'Respuesta no válida en: %', k.etiqueta using errcode = 'P0001'; end if;
      when 'parrafo' then
        if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 4000 then raise exception 'Respuesta no válida en: %', k.etiqueta using errcode = 'P0001'; end if;
      when 'numero' then
        if jsonb_typeof(v) <> 'number' then raise exception 'Escribe un número en: %', k.etiqueta using errcode = 'P0001'; end if;
      when 'fecha' then
        if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha no válida en: %', k.etiqueta using errcode = 'P0001'; end if;
      when 'radio', 'lista' then
        if jsonb_typeof(v) <> 'string' or not (k.opciones ? (v #>> '{}')) then raise exception 'Elige una opción válida en: %', k.etiqueta using errcode = 'P0001'; end if;
      when 'checkbox' then
        if jsonb_typeof(v) <> 'array' or exists (select 1 from jsonb_array_elements_text(v) x where not (k.opciones ? x)) then
          raise exception 'Elige opciones válidas en: %', k.etiqueta using errcode = 'P0001';
        end if;
      when 'escala' then
        if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric < coalesce(k.escala_min, 1) or (v #>> '{}')::numeric > coalesce(k.escala_max, 5) then
          raise exception 'Elige un valor dentro de la escala en: %', k.etiqueta using errcode = 'P0001';
        end if;
      when 'si_no' then
        if jsonb_typeof(v) <> 'boolean' then raise exception 'Responde sí o no en: %', k.etiqueta using errcode = 'P0001'; end if;
    end case;
    insert into public.formulario_respuestas (envio_id, campo_id, valor) values (v_envio, k.id, v);
  end loop;
end $$;

-- Resumen de resultados (lo calcula la base; respeta los permisos de quien lo pide).
create or replace function public.formulario_resultados(p_formulario uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare k public.formulario_campos; res jsonb := '[]'::jsonb; resumen jsonb; n int; v_total int;
begin
  select count(*) into v_total from public.formulario_envios where formulario_id = p_formulario;
  for k in select * from public.formulario_campos c where c.formulario_id = p_formulario order by c.orden, c.creado_en loop
    select count(*) into n from public.formulario_respuestas where campo_id = k.id;
    resumen := case k.tipo
      when 'radio' then (select coalesce(jsonb_object_agg(x.o, x.c), '{}') from (select o #>> '{}' as o, (select count(*) from public.formulario_respuestas r where r.campo_id = k.id and r.valor = o) as c from jsonb_array_elements(k.opciones) o) x)
      when 'lista' then (select coalesce(jsonb_object_agg(x.o, x.c), '{}') from (select o #>> '{}' as o, (select count(*) from public.formulario_respuestas r where r.campo_id = k.id and r.valor = o) as c from jsonb_array_elements(k.opciones) o) x)
      when 'checkbox' then (select coalesce(jsonb_object_agg(x.o, x.c), '{}') from (select o #>> '{}' as o, (select count(*) from public.formulario_respuestas r where r.campo_id = k.id and r.valor ? (o #>> '{}')) as c from jsonb_array_elements(k.opciones) o) x)
      when 'si_no' then jsonb_build_object('si', (select count(*) from public.formulario_respuestas r where r.campo_id = k.id and r.valor = 'true'::jsonb),
                                           'no', (select count(*) from public.formulario_respuestas r where r.campo_id = k.id and r.valor = 'false'::jsonb))
      when 'escala' then (select jsonb_build_object('promedio', round(avg((valor #>> '{}')::numeric), 2), 'minimo', min((valor #>> '{}')::numeric), 'maximo', max((valor #>> '{}')::numeric),
                                  'distribucion', (select coalesce(jsonb_object_agg(d.v, d.c), '{}') from (select (r2.valor #>> '{}') as v, count(*) as c from public.formulario_respuestas r2 where r2.campo_id = k.id group by 1) d))
                          from public.formulario_respuestas r where r.campo_id = k.id)
      when 'numero' then (select jsonb_build_object('promedio', round(avg((valor #>> '{}')::numeric), 2), 'minimo', min((valor #>> '{}')::numeric), 'maximo', max((valor #>> '{}')::numeric))
                          from public.formulario_respuestas r where r.campo_id = k.id)
      else (select jsonb_build_object('valores', coalesce(jsonb_agg(valor #>> '{}' order by e.creado_en desc) filter (where valor is not null), '[]'))
            from (select r.valor, e.creado_en from public.formulario_respuestas r join public.formulario_envios e on e.id = r.envio_id where r.campo_id = k.id order by e.creado_en desc limit 100) e(valor, creado_en))
    end;
    res := res || jsonb_build_array(jsonb_build_object('campo_id', k.id, 'etiqueta', k.etiqueta, 'tipo', k.tipo, 'activo', k.activo, 'respuestas', n, 'resumen', resumen));
  end loop;
  return jsonb_build_object(
    'envios', v_total,
    'por_rol', (select coalesce(jsonb_object_agg(coalesce(x.rol, '—'), x.c), '{}') from (select rol, count(*) c from public.formulario_envios where formulario_id = p_formulario group by rol) x),
    'campos', res);
end $$;

revoke all on function public.formulario_publico(text), public.formulario_enviar(text, jsonb) from public;
revoke all on function public.formulario_resultados(uuid) from public, anon;
grant execute on function public.formulario_publico(text), public.formulario_enviar(text, jsonb) to anon, authenticated;
grant execute on function public.formulario_resultados(uuid) to authenticated;
grant execute on all functions in schema app to authenticated;
revoke all on all functions in schema app from anon, public;

-- ═══════════════ 20261023000016_calificacion_inicial.sql ═══════════════
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
-- 017 · Aclaración del negocio: los formularios van dirigidos a los delegados de una comisión y su feedback NO modifica
--       la nota de nadie. Lo lee el EyC, que saca sus conclusiones viendo las respuestas.
--       · Se retira la puntuación automática desde formularios (columnas `fuente` y `puntua`).
--       · La puntuación para decidir rotaciones queda con dos fuentes: calificación inicial y valoración de EyC (rúbrica).
--       · Nuevo tipo de campo «personas»: se elige a una persona registrada en la comisión (por ejemplo, «quién dio el taller»)
--         o «Otro» si fue alguien externo.

alter table public.formularios drop column fuente;
alter table public.formulario_campos drop column puntua;

alter table public.formulario_campos drop constraint formulario_campos_tipo_check;
alter table public.formulario_campos add constraint formulario_campos_tipo_check
  check (tipo in ('texto', 'parrafo', 'numero', 'fecha', 'radio', 'checkbox', 'lista', 'escala', 'si_no', 'personas'));

-- Pesos por día: solo dos fuentes (editables). Día 2: 70/30 · Día 3: 40/60.
update public.config
   set valor = '{"2":{"inicial":70,"eyc":30},"3":{"inicial":40,"eyc":60}}',
       descripcion = 'Pesos de la calificación inicial y de la valoración de EyC para decidir la rotación del Día 2 y del Día 3 (cada día suma 100).'
 where clave = 'ponderacion_rotacion';

drop function public.puntuacion_rotacion(integer);
create function public.puntuacion_rotacion(p_dia integer)
returns table (persona_id uuid, nombre text, inicial numeric, eyc numeric, peso_inicial numeric, peso_eyc numeric, total numeric, pesos_validos boolean)
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_ini date := coalesce((select (c.valor #>> '{}')::date from public.config c where c.clave = 'sesiones_inicio'), date '2026-11-16');
  v_dia date := v_ini + (p_dia - 1);
  v_w jsonb := (select c.valor -> p_dia::text from public.config c where c.clave = 'ponderacion_rotacion');
  wi numeric := coalesce((v_w ->> 'inicial')::numeric, 0);
  we numeric := coalesce((v_w ->> 'eyc')::numeric, 0);
begin
  if p_dia < 2 then raise exception 'La rotación se decide para el Día 2 en adelante.'; end if;
  return query
  with ev as (   -- valoración de EyC: rúbrica de las jornadas anteriores de las sesiones
    select vp.persona_id as pid, avg(vp.puntaje) as nota
    from public.v_evaluacion_puntaje vp
    where vp.estado = 'completa' and vp.puntaje is not null and vp.fecha_jornada is not null and vp.fecha_jornada >= v_ini and vp.fecha_jornada < v_dia
    group by vp.persona_id
  ), base as (
    select p.id as pid, p.nombre as pnombre, ci.total as t_ini, round(ev.nota, 2) as t_eyc
    from public.personas p
    left join public.v_calificacion_inicial ci on ci.persona_id = p.id
    left join ev on ev.pid = p.id
    where p.ambito = 'mesa' and p.activa
  )
  select b.pid, b.pnombre, b.t_ini, b.t_eyc, wi, we,
         case when (wi + we) = 100 and (case when b.t_ini is not null then wi else 0 end + case when b.t_eyc is not null then we else 0 end) > 0
              then round((coalesce(b.t_ini * wi, 0) + coalesce(b.t_eyc * we, 0))
                         / (case when b.t_ini is not null then wi else 0 end + case when b.t_eyc is not null then we else 0 end), 2) end,
         (wi + we) = 100
  from base b
  order by b.pnombre;
end $$;
revoke all on function public.puntuacion_rotacion(integer) from public, anon;
grant execute on function public.puntuacion_rotacion(integer) to authenticated;

-- Personas de una comisión para el campo «personas» del formulario público (solo nombre y cargo; solo si el formulario
-- está activo y tiene un campo de ese tipo).
create or replace function public.formulario_personas(p_codigo text, p_comision smallint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare f public.formularios;
begin
  select * into f from public.formularios where codigo = lower(trim(p_codigo)) and activo;
  if f.id is null then raise exception 'Este formulario no está disponible.' using errcode = 'P0001'; end if;
  if not f.pide_comision or not exists (select 1 from public.formulario_campos k where k.formulario_id = f.id and k.activo and k.tipo = 'personas') then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'nombre', x.nombre, 'cargo', x.cargo) order by x.nombre)
    from (select distinct p.id, p.nombre, ca.nombre as cargo
          from public.personas p
          join public.asignaciones a on a.persona_id = p.id and a.comision_id = p_comision
          join public.cargos ca on ca.id = a.cargo_id
          where p.activa and a.hasta is null) x
  ), '[]'::jsonb);
end $$;
revoke all on function public.formulario_personas(text, smallint) from public;
grant execute on function public.formulario_personas(text, smallint) to anon, authenticated;

-- Envío: valida también el campo «personas».
create or replace function public.formulario_enviar(p_codigo text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  f public.formularios; k public.formulario_campos; v jsonb; r jsonb := coalesce(p -> 'respuestas', '{}'::jsonb);
  v_rol text := nullif(trim(p ->> 'rol'), ''); v_ref text := nullif(trim(p ->> 'referencia'), '');
  v_com smallint := nullif(p ->> 'comision_id', '')::smallint;
  v_hdr jsonb; v_huella text; v_envio uuid; n int; v_nom text;
begin
  if coalesce(p ->> 'web', '') <> '' then return; end if;                       -- trampa para bots: se ignora en silencio
  select * into f from public.formularios where codigo = lower(trim(p_codigo)) and activo;
  if f.id is null then raise exception 'Este formulario no está disponible.' using errcode = 'P0001'; end if;
  if cardinality(f.roles) > 0 and (v_rol is null or v_rol <> all (f.roles)) then
    raise exception 'Elige quién eres.' using errcode = 'P0001';
  end if;
  if f.pide_comision and not exists (select 1 from public.comisiones c where c.id = v_com and c.activa) then
    raise exception 'Elige la comisión.' using errcode = 'P0001';
  end if;
  if f.pide_referencia and v_ref is null then raise exception 'Escribe la sesión o el taller.' using errcode = 'P0001'; end if;
  if length(coalesce(v_ref, '')) > 120 then raise exception 'La sesión o el taller es demasiado largo.' using errcode = 'P0001'; end if;

  -- Límite: pocas respuestas seguidas desde el mismo dispositivo.
  v_hdr := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_huella := md5(coalesce(v_hdr ->> 'x-forwarded-for', '') || '|' || coalesce(v_hdr ->> 'user-agent', ''));
  select count(*) into n from public.formulario_envios e
   where e.formulario_id = f.id and e.huella = v_huella and e.creado_en > now() - interval '10 minutes';
  if n >= 5 then raise exception 'Enviaste varias respuestas seguidas. Espera unos minutos y vuelve a intentarlo.' using errcode = 'P0001'; end if;

  insert into public.formulario_envios (formulario_id, rol, comision_id, referencia, huella)
  values (f.id, v_rol, case when f.pide_comision then v_com end, v_ref, v_huella) returning id into v_envio;

  for k in select * from public.formulario_campos c
           where c.formulario_id = f.id and c.activo and (cardinality(c.roles) = 0 or v_rol = any (c.roles)) order by c.orden, c.creado_en loop
    v := r -> k.id::text;
    if v is null or v = 'null'::jsonb or v = '""'::jsonb or v = '[]'::jsonb or v = '{}'::jsonb then
      if k.obligatorio then raise exception 'Falta responder: %', k.etiqueta using errcode = 'P0001'; end if;
      continue;
    end if;
    case k.tipo
      when 'texto' then
        if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 500 then raise exception 'Respuesta no válida en: %', k.etiqueta using errcode = 'P0001'; end if;
      when 'parrafo' then
        if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 4000 then raise exception 'Respuesta no válida en: %', k.etiqueta using errcode = 'P0001'; end if;
      when 'numero' then
        if jsonb_typeof(v) <> 'number' then raise exception 'Escribe un número en: %', k.etiqueta using errcode = 'P0001'; end if;
      when 'fecha' then
        if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha no válida en: %', k.etiqueta using errcode = 'P0001'; end if;
      when 'radio', 'lista' then
        if jsonb_typeof(v) <> 'string' or not (k.opciones ? (v #>> '{}')) then raise exception 'Elige una opción válida en: %', k.etiqueta using errcode = 'P0001'; end if;
      when 'checkbox' then
        if jsonb_typeof(v) <> 'array' or exists (select 1 from jsonb_array_elements_text(v) x where not (k.opciones ? x)) then
          raise exception 'Elige opciones válidas en: %', k.etiqueta using errcode = 'P0001';
        end if;
      when 'escala' then
        if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric < coalesce(k.escala_min, 1) or (v #>> '{}')::numeric > coalesce(k.escala_max, 5) then
          raise exception 'Elige un valor dentro de la escala en: %', k.etiqueta using errcode = 'P0001';
        end if;
      when 'si_no' then
        if jsonb_typeof(v) <> 'boolean' then raise exception 'Responde sí o no en: %', k.etiqueta using errcode = 'P0001'; end if;
      when 'personas' then
        -- Una persona registrada en la comisión elegida, o «Otro» (alguien externo) con su nombre.
        if jsonb_typeof(v) <> 'object' then raise exception 'Elige una persona en: %', k.etiqueta using errcode = 'P0001'; end if;
        if nullif(trim(v ->> 'otro'), '') is not null then
          if length(trim(v ->> 'otro')) > 120 then raise exception 'El nombre es demasiado largo en: %', k.etiqueta using errcode = 'P0001'; end if;
          v := jsonb_build_object('otro', trim(v ->> 'otro'));
        else
          select p.nombre into v_nom
            from public.personas p
            join public.asignaciones a on a.persona_id = p.id and a.comision_id = v_com and a.hasta is null
           where f.pide_comision and p.activa and p.id::text = (v ->> 'persona_id') limit 1;
          if v_nom is null then raise exception 'Elige una persona de la comisión (o «Otro») en: %', k.etiqueta using errcode = 'P0001'; end if;
          v := jsonb_build_object('persona_id', v ->> 'persona_id', 'nombre', v_nom);
        end if;
    end case;
    insert into public.formulario_respuestas (envio_id, campo_id, valor) values (v_envio, k.id, v);
  end loop;
end $$;

-- Resultados: el campo «personas» se resume por nombre, y los «Otro» aparte.
create or replace function public.formulario_resultados(p_formulario uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare k public.formulario_campos; res jsonb := '[]'::jsonb; resumen jsonb; n int; v_total int;
begin
  select count(*) into v_total from public.formulario_envios where formulario_id = p_formulario;
  for k in select * from public.formulario_campos c where c.formulario_id = p_formulario order by c.orden, c.creado_en loop
    select count(*) into n from public.formulario_respuestas where campo_id = k.id;
    resumen := case k.tipo
      when 'radio' then (select coalesce(jsonb_object_agg(x.o, x.c), '{}') from (select o #>> '{}' as o, (select count(*) from public.formulario_respuestas r where r.campo_id = k.id and r.valor = o) as c from jsonb_array_elements(k.opciones) o) x)
      when 'lista' then (select coalesce(jsonb_object_agg(x.o, x.c), '{}') from (select o #>> '{}' as o, (select count(*) from public.formulario_respuestas r where r.campo_id = k.id and r.valor = o) as c from jsonb_array_elements(k.opciones) o) x)
      when 'checkbox' then (select coalesce(jsonb_object_agg(x.o, x.c), '{}') from (select o #>> '{}' as o, (select count(*) from public.formulario_respuestas r where r.campo_id = k.id and r.valor ? (o #>> '{}')) as c from jsonb_array_elements(k.opciones) o) x)
      when 'si_no' then jsonb_build_object('si', (select count(*) from public.formulario_respuestas r where r.campo_id = k.id and r.valor = 'true'::jsonb),
                                           'no', (select count(*) from public.formulario_respuestas r where r.campo_id = k.id and r.valor = 'false'::jsonb))
      when 'escala' then (select jsonb_build_object('promedio', round(avg((valor #>> '{}')::numeric), 2), 'minimo', min((valor #>> '{}')::numeric), 'maximo', max((valor #>> '{}')::numeric),
                                  'distribucion', (select coalesce(jsonb_object_agg(d.v, d.c), '{}') from (select (r2.valor #>> '{}') as v, count(*) as c from public.formulario_respuestas r2 where r2.campo_id = k.id group by 1) d))
                          from public.formulario_respuestas r where r.campo_id = k.id)
      when 'numero' then (select jsonb_build_object('promedio', round(avg((valor #>> '{}')::numeric), 2), 'minimo', min((valor #>> '{}')::numeric), 'maximo', max((valor #>> '{}')::numeric))
                          from public.formulario_respuestas r where r.campo_id = k.id)
      when 'personas' then jsonb_build_object(
          'conteo', (select coalesce(jsonb_object_agg(d.nombre, d.c), '{}') from (select r.valor ->> 'nombre' as nombre, count(*) as c from public.formulario_respuestas r where r.campo_id = k.id and r.valor ? 'nombre' group by 1) d),
          'otros', (select coalesce(jsonb_agg(r.valor ->> 'otro'), '[]') from public.formulario_respuestas r where r.campo_id = k.id and r.valor ? 'otro'))
      else (select jsonb_build_object('valores', coalesce(jsonb_agg(valor #>> '{}' order by e.creado_en desc) filter (where valor is not null), '[]'))
            from (select r.valor, e.creado_en from public.formulario_respuestas r join public.formulario_envios e on e.id = r.envio_id where r.campo_id = k.id order by e.creado_en desc limit 100) e(valor, creado_en))
    end;
    res := res || jsonb_build_array(jsonb_build_object('campo_id', k.id, 'etiqueta', k.etiqueta, 'tipo', k.tipo, 'activo', k.activo, 'respuestas', n, 'resumen', resumen));
  end loop;
  return jsonb_build_object(
    'envios', v_total,
    'por_rol', (select coalesce(jsonb_object_agg(coalesce(x.rol, '—'), x.c), '{}') from (select rol, count(*) c from public.formulario_envios where formulario_id = p_formulario group by rol) x),
    'campos', res);
end $$;

revoke all on function public.formulario_enviar(text, jsonb) from public;
grant execute on function public.formulario_enviar(text, jsonb) to anon, authenticated;
revoke all on function public.formulario_resultados(uuid) from public, anon;
grant execute on function public.formulario_resultados(uuid) to authenticated;
