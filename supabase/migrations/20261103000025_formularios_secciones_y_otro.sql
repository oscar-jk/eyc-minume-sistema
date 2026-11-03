-- 025 · Formularios: nuevo tipo de campo «Sección» (título + indicaciones, no se responde) y opción «Otro: …» en
--       opción única y casillas. Hacen falta para replicar formularios de Google Forms tal cual.
--   · seccion: encabezado con texto de ayuda; nunca se valida, ni se guarda, ni sale en resultados.
--   · con_otro: además de las opciones de la lista, la persona puede escribir la suya. Se guarda como «Otro: texto».
--   Todo lo existente queda igual (con_otro = false).

alter table public.formulario_campos add column con_otro boolean not null default false;

alter table public.formulario_campos drop constraint formulario_campos_tipo_check;
alter table public.formulario_campos add constraint formulario_campos_tipo_check
  check (tipo in ('texto', 'parrafo', 'numero', 'fecha', 'radio', 'checkbox', 'lista', 'escala', 'si_no', 'personas', 'seccion'));
alter table public.formulario_campos add constraint formulario_campos_otro_chk check (not con_otro or tipo in ('radio', 'checkbox'));

-- ───────────── Página pública: manda también si el campo admite «Otro» ─────────────
create or replace function public.formulario_publico_base(p_codigo text) returns jsonb
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
                  'opciones', k.opciones, 'escala_min', coalesce(k.escala_min, 1), 'escala_max', coalesce(k.escala_max, 5), 'roles', to_jsonb(k.roles),
                  'con_otro', k.con_otro)
                  order by k.orden, k.creado_en), '[]')
               from public.formulario_campos k where k.formulario_id = f.id and k.activo));
end $$;

-- ───────────── Recibir una respuesta: las secciones se saltan y «Otro: …» es válido donde se permite ─────────────
create or replace function public.formulario_enviar_base(p_codigo text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  f public.formularios; k public.formulario_campos; v jsonb; r jsonb := coalesce(p -> 'respuestas', '{}'::jsonb);
  v_rol text := nullif(trim(p ->> 'rol'), ''); v_ref text := nullif(trim(p ->> 'referencia'), '');
  v_com smallint := nullif(p ->> 'comision_id', '')::smallint;
  v_hdr jsonb; v_huella text; v_envio uuid; v_nom text;
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

  -- Sin límite de respuestas por dispositivo: en una sesión con cientos de personas en la misma red
  -- compartirían la misma huella. Se conserva la huella solo para estadísticas y la trampa anti-bots (campo «web»).
  v_hdr := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_huella := md5(coalesce(v_hdr ->> 'x-forwarded-for', '') || '|' || coalesce(v_hdr ->> 'user-agent', ''));

  insert into public.formulario_envios (formulario_id, rol, comision_id, referencia, huella)
  values (f.id, v_rol, case when f.pide_comision then v_com end, v_ref, v_huella) returning id into v_envio;

  for k in select * from public.formulario_campos c
           where c.formulario_id = f.id and c.activo and c.tipo <> 'seccion' and (cardinality(c.roles) = 0 or v_rol = any (c.roles)) order by c.orden, c.creado_en loop
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
        if jsonb_typeof(v) <> 'string'
           or not (k.opciones ? (v #>> '{}') or (k.con_otro and (v #>> '{}') like 'Otro: %' and length(trim(substr(v #>> '{}', 7))) between 1 and 300)) then
          raise exception 'Elige una opción válida en: %', k.etiqueta using errcode = 'P0001';
        end if;
      when 'checkbox' then
        if jsonb_typeof(v) <> 'array' or exists (
             select 1 from jsonb_array_elements_text(v) x
              where not (k.opciones ? x or (k.con_otro and x like 'Otro: %' and length(trim(substr(x, 7))) between 1 and 300))) then
          raise exception 'Elige opciones válidas en: %', k.etiqueta using errcode = 'P0001';
        end if;
        if (select count(*) from jsonb_array_elements_text(v) x where x like 'Otro: %') > 1 then
          raise exception 'Solo puedes escribir una opción propia en: %', k.etiqueta using errcode = 'P0001';
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

-- ───────────── Resultados: sin secciones, y las respuestas «Otro: …» aparte ─────────────
create or replace function public.formulario_resultados(p_formulario uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare k public.formulario_campos; res jsonb := '[]'::jsonb; resumen jsonb; n int; v_total int; v_otros jsonb;
begin
  select count(*) into v_total from public.formulario_envios where formulario_id = p_formulario;
  for k in select * from public.formulario_campos c where c.formulario_id = p_formulario and c.tipo <> 'seccion' order by c.orden, c.creado_en loop
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
    v_otros := null;
    if k.con_otro then
      v_otros := case k.tipo
        when 'radio' then (select coalesce(jsonb_agg(substr(r.valor #>> '{}', 7)), '[]') from public.formulario_respuestas r where r.campo_id = k.id and jsonb_typeof(r.valor) = 'string' and (r.valor #>> '{}') like 'Otro: %')
        else (select coalesce(jsonb_agg(substr(x, 7)), '[]') from public.formulario_respuestas r, jsonb_array_elements_text(r.valor) x where r.campo_id = k.id and jsonb_typeof(r.valor) = 'array' and x like 'Otro: %')
      end;
    end if;
    res := res || jsonb_build_array(jsonb_build_object('campo_id', k.id, 'etiqueta', k.etiqueta, 'tipo', k.tipo, 'activo', k.activo, 'respuestas', n, 'resumen', resumen, 'otros', v_otros));
  end loop;
  return jsonb_build_object(
    'envios', v_total,
    'por_rol', (select coalesce(jsonb_object_agg(coalesce(x.rol, '—'), x.c), '{}') from (select rol, count(*) c from public.formulario_envios where formulario_id = p_formulario group by rol) x),
    'campos', res);
end $$;

-- ───────────── Copia de un formulario: también copia «Otro» ─────────────
create or replace function public.duplicar_formulario(p_id uuid, p_titulo text default null, p_comision smallint default null) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare f public.formularios; v_nuevo uuid;
begin
  select * into f from public.formularios where id = p_id;
  if f.id is null then raise exception 'No se encontró el formulario.' using errcode = 'P0001'; end if;
  insert into public.formularios (titulo, descripcion, roles, pide_comision, pide_referencia, comision_fija, activo)
  values (coalesce(nullif(trim(p_titulo), ''), f.titulo || ' (copia)'), f.descripcion, f.roles,
          f.pide_comision or p_comision is not null, f.pide_referencia, coalesce(p_comision, f.comision_fija), false)
  returning id into v_nuevo;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, ayuda, obligatorio, opciones, escala_min, escala_max, roles, con_otro)
  select v_nuevo, k.orden, k.tipo, k.etiqueta, k.ayuda, k.obligatorio, k.opciones, k.escala_min, k.escala_max, k.roles, k.con_otro
  from public.formulario_campos k where k.formulario_id = f.id and k.activo order by k.orden, k.creado_en;
  return v_nuevo;
end $$;
