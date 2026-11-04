-- 026 · Cada cuenta con rol EyC tiene su persona «Miembro de EyC».
--   El panel «Evaluación de evaluadores» lee Personas, no Cuentas: las cuentas EyC creadas en Configuración no aparecían
--   hasta registrarlas a mano. Ahora, al quedar una cuenta con rol «eyc» (y comisión) sin persona vinculada, se crea la
--   persona (ámbito eyc, cargo «Miembro de EyC», comisión de la cuenta) con su asignación inicial y se vincula al perfil.
--   Una cuenta que ya trae persona_id (vinculada a mano) no se toca. Las personas de mesa tampoco.

create or replace function app.vincular_persona_eyc(p_perfil uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.perfiles; v_persona uuid;
begin
  select * into v from public.perfiles where id = p_perfil;
  if v.id is null or v.rol is distinct from 'eyc' or v.persona_id is not null or v.comision_id is null then return; end if;

  insert into public.personas (nombre, ambito, comision_origen_id, cargo_base_id, correo, activa, creado_por)
  values (coalesce(nullif(trim(v.nombre), ''), split_part(v.email, '@', 1)), 'eyc', v.comision_id,
          (select c.id from public.cargos c where c.clave = 'eyc'), nullif(trim(v.email), ''), v.activo, null)
  returning id into v_persona;

  insert into public.asignaciones (persona_id, comision_id, cargo_id, motivo, creado_por)
  values (v_persona, v.comision_id, (select c.id from public.cargos c where c.clave = 'eyc'), 'inicial', null);

  update public.perfiles set persona_id = v_persona where id = v.id;
end $$;

create or replace function app.tg_persona_eyc() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.vincular_persona_eyc(new.id);
  return null;
end $$;

create trigger persona_eyc after insert or update of rol, comision_id on public.perfiles
  for each row execute function app.tg_persona_eyc();

-- Cuentas EyC que ya existen sin persona.
select app.vincular_persona_eyc(p.id) from public.perfiles p
where p.rol = 'eyc' and p.persona_id is null and p.comision_id is not null;
