-- 018 · Formularios por comisión y copia de formularios.
--   · `comision_fija`: un formulario puede quedar fijado a una comisión. Su enlace ya trae la comisión: la persona que responde
--     no la elige y el servidor la fuerza (aunque alguien manipule el envío). Sin comisión fija, la persona la elige como hasta ahora.
--   · `duplicar_formulario`: copia un formulario (datos y preguntas) a uno nuevo, independiente, cerrado y sin respuestas,
--     con otro enlace. Sirve para «Taller 1», «Taller 2», o una copia por comisión.
--   Las funciones públicas de 015/017 se conservan como funciones base (sin acceso para `anon`) y las nuevas las envuelven.

alter table public.formularios add column comision_fija smallint references public.comisiones(id);
create index on public.formularios (comision_fija);
alter table public.formularios add constraint formularios_comision_fija_pide check (comision_fija is null or pide_comision);

-- ───────────── Funciones públicas: envoltorios que aplican la comisión fija ─────────────
alter function public.formulario_publico(text)          rename to formulario_publico_base;
alter function public.formulario_enviar(text, jsonb)    rename to formulario_enviar_base;
alter function public.formulario_personas(text, smallint) rename to formulario_personas_base;
revoke all on function public.formulario_publico_base(text), public.formulario_enviar_base(text, jsonb), public.formulario_personas_base(text, smallint)
  from public, anon, authenticated;

create or replace function public.formulario_publico(p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb := public.formulario_publico_base(p_codigo); v_fija smallint;
begin
  select f.comision_fija into v_fija from public.formularios f where f.codigo = lower(trim(p_codigo)) and f.activo;
  if v_fija is null then return v || jsonb_build_object('comision_fija', null); end if;
  return v || jsonb_build_object(
    'comision_fija', v_fija,
    'comisiones', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'sigla', coalesce(c.sigla, upper(c.clave)), 'nombre', c.nombre)), '[]')
                   from public.comisiones c where c.id = v_fija and c.activa));
end $$;

create or replace function public.formulario_enviar(p_codigo text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_fija smallint;
begin
  select f.comision_fija into v_fija from public.formularios f where f.codigo = lower(trim(p_codigo)) and f.activo;
  if v_fija is not null then p := jsonb_set(coalesce(p, '{}'::jsonb), '{comision_id}', to_jsonb(v_fija)); end if;
  perform public.formulario_enviar_base(p_codigo, p);
end $$;

create or replace function public.formulario_personas(p_codigo text, p_comision smallint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_fija smallint;
begin
  select f.comision_fija into v_fija from public.formularios f where f.codigo = lower(trim(p_codigo)) and f.activo;
  return public.formulario_personas_base(p_codigo, coalesce(v_fija, p_comision));
end $$;

revoke all on function public.formulario_publico(text), public.formulario_enviar(text, jsonb), public.formulario_personas(text, smallint) from public;
grant execute on function public.formulario_publico(text), public.formulario_enviar(text, jsonb), public.formulario_personas(text, smallint) to anon, authenticated;

-- ───────────── Copia de un formulario ─────────────
-- Corre con los permisos de quien la pide: solo copia lo que esa persona puede ver, y la copia queda a su nombre.
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
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, ayuda, obligatorio, opciones, escala_min, escala_max, roles)
  select v_nuevo, k.orden, k.tipo, k.etiqueta, k.ayuda, k.obligatorio, k.opciones, k.escala_min, k.escala_max, k.roles
  from public.formulario_campos k where k.formulario_id = f.id and k.activo order by k.orden, k.creado_en;
  return v_nuevo;
end $$;
revoke all on function public.duplicar_formulario(uuid, text, smallint) from public, anon;
grant execute on function public.duplicar_formulario(uuid, text, smallint) to authenticated;
