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
