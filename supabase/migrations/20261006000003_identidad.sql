-- 003 · Identidad: perfiles (cuentas), personas (evaluados) y asignaciones (cargo en el tiempo).

create table public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null default '',
  email       text not null,
  rol         public.rol_app,                       -- null = sin acceso hasta que un admin lo asigne
  comision_id smallint references public.comisiones(id),
  persona_id  uuid,                                 -- si la cuenta corresponde a una persona evaluada (miembro de EyC)
  activo      boolean not null default true,
  creado_en   timestamptz not null default now(),
  check (rol <> 'eyc' or comision_id is not null)
);
create index on public.perfiles (comision_id);

create table public.personas (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null check (length(trim(nombre)) > 1),
  ambito             public.ambito not null,
  comision_origen_id smallint references public.comisiones(id),
  cargo_base_id      smallint references public.cargos(id),
  correo             text,
  activa             boolean not null default true,
  notas              text,
  creado_en          timestamptz not null default now(),
  creado_por         uuid default auth.uid()
);
create index on public.personas (comision_origen_id);
create index on public.personas (cargo_base_id);

alter table public.perfiles
  add constraint perfiles_persona_fk foreign key (persona_id) references public.personas(id) on delete set null;
create index on public.perfiles (persona_id);

create table public.asignaciones (
  id          uuid primary key default gen_random_uuid(),
  persona_id  uuid not null references public.personas(id),
  comision_id smallint not null references public.comisiones(id),
  cargo_id    smallint not null references public.cargos(id),
  desde       timestamptz not null default now(),
  hasta       timestamptz,
  motivo      public.motivo_asignacion not null,
  nota        text,
  cargo_unico boolean not null default true,       -- copiado de cargos.unico_por_comision por trigger
  creado_por  uuid default auth.uid(),
  creado_en   timestamptz not null default now(),
  check (hasta is null or hasta > desde),
  -- Una persona no puede estar en dos cargos a la vez.
  constraint asignaciones_persona_sin_solape
    exclude using gist (persona_id with =, tstzrange(desde, hasta) with &&),
  -- Un cargo único no puede tener dos titulares a la vez en la misma comisión.
  constraint asignaciones_cargo_sin_solape
    exclude using gist (comision_id with =, cargo_id with =, tstzrange(desde, hasta) with &&) where (cargo_unico)
);
-- Solo un cargo abierto por comisión (requisito explícito) y una asignación abierta por persona.
create unique index asignaciones_cargo_abierto_uq on public.asignaciones (comision_id, cargo_id) where hasta is null and cargo_unico;
create unique index asignaciones_persona_abierta_uq on public.asignaciones (persona_id) where hasta is null;
create index on public.asignaciones (cargo_id);
create index on public.asignaciones (comision_id, desde);

create or replace function app.tg_asignacion_cargo_unico() returns trigger
language plpgsql set search_path = '' as $$
begin
  select c.unico_por_comision into new.cargo_unico from public.cargos c where c.id = new.cargo_id;
  return new;
end $$;
create trigger asignacion_cargo_unico before insert or update of cargo_id on public.asignaciones
  for each row execute function app.tg_asignacion_cargo_unico();

-- ───────────── Helpers de sesión (security definer → sin recursión en RLS) ─────────────
create or replace function app.rol() returns public.rol_app
language sql stable security definer set search_path = '' as $$
  select p.rol from public.perfiles p where p.id = auth.uid() and p.activo
$$;

create or replace function app.comision() returns smallint
language sql stable security definer set search_path = '' as $$
  select p.comision_id from public.perfiles p where p.id = auth.uid() and p.activo
$$;

create or replace function app.es(roles public.rol_app[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.rol = any(roles) from public.perfiles p where p.id = auth.uid() and p.activo), false)
$$;

-- ¿La persona pasó alguna vez por la comisión del usuario actual?
create or replace function app.persona_en_mi_comision(p_persona uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.asignaciones a
    where a.persona_id = p_persona and a.comision_id = app.comision()
  )
$$;

grant execute on all functions in schema app to authenticated;

-- ───────────── Alta automática de perfil ─────────────
-- rol/comisión solo se leen de app_metadata (solo la service role puede escribirla).
create or replace function app.tg_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, email, nombre, rol, comision_id)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'nombre', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_app_meta_data->>'rol', '')::public.rol_app,
    nullif(new.raw_app_meta_data->>'comision_id', '')::smallint
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger en_nuevo_usuario after insert on auth.users
  for each row execute function app.tg_nuevo_usuario();

create or replace function app.tg_email_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.perfiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end $$;

create trigger en_cambio_email after update of email on auth.users
  for each row execute function app.tg_email_usuario();
