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
