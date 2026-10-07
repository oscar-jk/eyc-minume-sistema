-- 002 · Tipos, esquema interno y catálogos configurables (con datos semilla).

create extension if not exists btree_gist with schema extensions;

-- Esquema interno: helpers no expuestos por la API REST.
create schema if not exists app;
revoke all on schema app from public, anon;
grant usage on schema app to authenticated;

-- ───────────────────────── Tipos ─────────────────────────
create type public.ambito             as enum ('mesa', 'eyc');
create type public.rol_app            as enum ('eyc', 'subsecretario', 'secretario', 'admin');
create type public.estado_fase        as enum ('pendiente', 'abierta', 'cerrada');
create type public.tipo_fase          as enum ('evaluacion', 'recomendacion');
create type public.respuesta_criterio as enum ('si', 'no', 'no_observado');
create type public.estado_evaluacion  as enum ('borrador', 'completa');
create type public.motivo_asignacion  as enum ('inicial', 'rotacion', 'sustitucion', 'ajuste');
create type public.estatus_continuidad as enum ('continua', 'seguimiento', 'sustitucion', 'no_evaluado');
create type public.semaforo           as enum ('verde', 'amarillo', 'rojo', 'gris');
create type public.tipo_actividad     as enum ('taller', 'capacitacion', 'reunion', 'otra');

-- ───────────────────────── Catálogos ─────────────────────────
create table public.comisiones (
  id      smallint generated always as identity primary key,
  clave   text not null unique,
  nombre  text not null,
  sigla   text,                         -- null = "por definir"
  activa  boolean not null default true,
  orden   smallint not null default 0
);

create table public.cargos (
  id                 smallint generated always as identity primary key,
  clave              text not null unique,
  nombre             text not null,
  ambito             public.ambito not null,
  unico_por_comision boolean not null default true,  -- solo un titular abierto por comisión
  orden              smallint not null default 0
);

create table public.dimensiones (
  id           smallint generated always as identity primary key,
  clave        char(1) not null unique,
  nombre       text not null,
  competencias text not null,
  orden        smallint not null default 0
);

create table public.criterios (
  id            integer generated always as identity primary key,
  dimension_id  smallint not null references public.dimensiones(id),
  ambito        public.ambito not null,
  codigo        text not null,
  texto         text not null check (length(trim(texto)) > 0),
  favorable     public.respuesta_criterio not null check (favorable in ('si', 'no')),
  activo        boolean not null default true,
  orden         smallint not null default 0,
  version       integer not null default 1,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid,
  unique (ambito, codigo)
);
create index on public.criterios (dimension_id);

-- Historial de versiones de criterios (lo llena un trigger al editar).
create table public.criterios_historial (
  id           bigint generated always as identity primary key,
  criterio_id  integer not null references public.criterios(id) on delete cascade,
  version      integer not null,
  texto        text not null,
  favorable    public.respuesta_criterio not null,
  activo       boolean not null,
  vigente_hasta timestamptz not null default now(),
  autor        uuid
);
create index on public.criterios_historial (criterio_id);

create table public.pesos_dimension (
  ambito        public.ambito not null,
  dimension_id  smallint not null references public.dimensiones(id),
  peso          numeric(5,2) not null check (peso >= 0 and peso <= 100),
  primary key (ambito, dimension_id)
);
create index on public.pesos_dimension (dimension_id);

create table public.cortes (
  id               smallint generated always as identity primary key,
  clave            text not null unique,
  nombre           text not null,
  proposito        text not null,
  peso             numeric(5,2) not null check (peso >= 0 and peso <= 100),
  umbral_verde     numeric(5,2) not null default 80,
  umbral_amarillo  numeric(5,2) not null default 60,
  orden            smallint not null default 0,
  check (umbral_amarillo >= 0 and umbral_amarillo < umbral_verde and umbral_verde <= 100)
);

create table public.fases (
  id               smallint generated always as identity primary key,
  clave            text not null unique,
  nombre           text not null,
  tipo             public.tipo_fase not null,
  corte_id         smallint not null references public.cortes(id),
  inicio           date,
  fin              date,
  estado           public.estado_fase not null default 'pendiente',
  permite_rotacion boolean not null default false,
  es_evento        boolean not null default false,  -- evaluación por jornada, no por actividad
  orden            smallint not null default 0,
  check (inicio is null or fin is null or fin >= inicio)
);
create index on public.fases (corte_id);

create table public.config (
  clave        text primary key,
  valor        jsonb not null,
  descripcion  text not null,
  provisional  boolean not null default false
);

-- ───────────────────────── Semillas ─────────────────────────
insert into public.comisiones (clave, nombre, sigla, orden) values
  ('ctd',   'Comisión de Ciencia y Tecnología para el Desarrollo', 'CTD', 1),
  ('pnud',  'Programa de las Naciones Unidas para el Desarrollo', 'PNUD', 2),
  ('cop',   'Conferencia de las Partes', 'COP', 3),
  ('ams',   'Asamblea Mundial de la Salud', 'AMS', 4),
  ('csnu',  'Consejo de Seguridad de las Naciones Unidas', 'CSNU', 5),
  ('onudc', 'Oficina de las Naciones Unidas contra la Droga y el Delito', 'ONUDC', 6),
  ('cij',   'Corte Internacional de Justicia', 'CIJ', 7),
  ('foro-social-drdh', 'Foro Social del Consejo de Derechos Humanos', null, 8),
  ('onudi', 'Organización de las Naciones Unidas para el Desarrollo Industrial', 'ONUDI', 9),
  ('unctad','Conferencia de las Naciones Unidas sobre Comercio y Desarrollo', 'UNCTAD', 10),
  ('omt',   'Organización Mundial del Turismo', 'OMT', 11),
  ('cime',  'Conferencia Iberoamericana de Ministros de Educación', 'CIME', 12),
  ('oma',   'Organización Mundial de Aduanas', 'OMA', 13),
  ('crpd',  'Comité sobre los Derechos de las Personas con Discapacidad', null, 14),
  ('unesco-juventud-deporte', 'UNESCO sobre Juventud y Deporte', null, 15);

insert into public.cargos (clave, nombre, ambito, unico_por_comision, orden) values
  ('director',  'Director',            'mesa', true, 1),
  ('adjunto1',  'Director Adjunto I',  'mesa', true, 2),
  ('adjunto2',  'Director Adjunto II', 'mesa', true, 3),
  ('aprendiz',  'Miembro Aprendiz',    'mesa', true, 4),
  ('eyc',       'Miembro de Evaluación y Control', 'eyc', false, 5);

insert into public.dimensiones (clave, nombre, competencias, orden) values
  ('A', 'Cumplimiento y responsabilidad',   'Cumplimiento de rol, asistencia, puntualidad, organización, entregas, seguimiento', 1),
  ('B', 'Competencia académica y funcional','Procedimiento parlamentario, conocimiento del Manual, dominio temático, calidad técnica, redacción', 2),
  ('C', 'Trabajo colaborativo',             'Participación, decisiones, colaboración, liderazgo horizontal, apoyo', 3),
  ('D', 'Comunicación',                     'Comunicación interna y externa, claridad, escucha, retroalimentación', 4),
  ('E', 'Gestión humana y resolución',      'Conflictos, problemas, creatividad, inteligencia emocional, manejo de presión', 5),
  ('F', 'Ética, inclusión e innovación',    'Ética, transparencia, inclusión, compromiso social, iniciativa, aprendizaje, innovación', 6);

-- Criterios sembrados a partir de las competencias del instructivo; editables con historial.
insert into public.criterios (dimension_id, ambito, codigo, texto, favorable, orden)
select d.id, v.ambito::public.ambito, v.codigo, v.texto, v.fav::public.respuesta_criterio, v.orden
from (values
  -- Mesa directiva
  ('A','mesa','A1','Cumplió las funciones propias de su cargo','si',1),
  ('A','mesa','A2','Asistió a la actividad o jornada completa','si',2),
  ('A','mesa','A3','Llegó puntualmente','si',3),
  ('A','mesa','A4','Entregó a tiempo los productos o tareas asignadas','si',4),
  ('A','mesa','A5','Se mostró organizado y dio seguimiento a sus pendientes','si',5),
  ('B','mesa','B1','Mostró desconocimiento del procedimiento parlamentario','no',1),
  ('B','mesa','B2','Demostró conocimiento del Manual de procedimiento','si',2),
  ('B','mesa','B3','Demostró dominio del tema de su comisión','si',3),
  ('B','mesa','B4','Sus documentos presentaron errores técnicos o de redacción','no',4),
  ('C','mesa','C1','Participó activamente en las decisiones de la mesa','si',1),
  ('C','mesa','C2','Colaboró y apoyó a sus compañeros de mesa','si',2),
  ('C','mesa','C3','Ejerció un liderazgo horizontal, sin imponerse','si',3),
  ('D','mesa','D1','Se comunicó con claridad con la mesa y con las delegaciones','si',1),
  ('D','mesa','D2','Escuchó y dio retroalimentación de forma oportuna','si',2),
  ('D','mesa','D3','Hubo errores de comunicación interna o externa atribuibles a la persona','no',3),
  ('E','mesa','E1','Gestionó adecuadamente los conflictos o problemas que surgieron','si',1),
  ('E','mesa','E2','Mantuvo el control emocional bajo presión','si',2),
  ('E','mesa','E3','Propuso soluciones creativas ante imprevistos','si',3),
  ('F','mesa','F1','Actuó con ética y transparencia','si',1),
  ('F','mesa','F2','Promovió un trato inclusivo y respetuoso','si',2),
  ('F','mesa','F3','Mostró iniciativa, disposición a aprender o a innovar','si',3),
  -- Miembros de EyC
  ('A','eyc','A1','Cubrió todas las sesiones o actividades asignadas','si',1),
  ('A','eyc','A2','Entregó sus evaluaciones y reportes dentro del plazo','si',2),
  ('A','eyc','A3','Asistió puntualmente','si',3),
  ('B','eyc','B1','Aplicó correctamente la rúbrica y el instructivo','si',1),
  ('B','eyc','B2','Sus evaluaciones tuvieron comentarios insuficientes o sin sustento','no',2),
  ('C','eyc','C1','Coordinó con el equipo de EyC y con la Subsecretaría','si',1),
  ('D','eyc','D1','Reportó oportunamente las situaciones relevantes','si',1),
  ('D','eyc','D2','Sus comentarios fueron claros y verificables','si',2),
  ('E','eyc','E1','Manejó con tacto las situaciones sensibles con la mesa directiva','si',1),
  ('F','eyc','F1','Evaluó con objetividad e imparcialidad','si',1),
  ('F','eyc','F2','Mantuvo la confidencialidad de la información','si',2),
  ('F','eyc','F3','Propuso mejoras al proceso de evaluación','si',3)
) as v(dim, ambito, codigo, texto, fav, orden)
join public.dimensiones d on d.clave = v.dim;

insert into public.pesos_dimension (ambito, dimension_id, peso)
select v.ambito::public.ambito, d.id, v.peso
from (values
  ('mesa','A',20),('mesa','B',30),('mesa','C',15),('mesa','D',15),('mesa','E',10),('mesa','F',10),
  ('eyc','A',25),('eyc','B',15),('eyc','C',10),('eyc','D',20),('eyc','E',10),('eyc','F',20)
) as v(ambito, dim, peso)
join public.dimensiones d on d.clave = v.dim;

insert into public.cortes (clave, nombre, proposito, peso, orden) values
  ('c1',    'Corte 1 — Preparación', 'Incorporación, capacitaciones y preparación previa', 25, 1),
  ('c2',    'Corte 2 — Seguimiento', 'Desempeño de los días 1 y 2 del evento', 25, 2),
  ('final', 'Evaluación Final',      'Desempeño de los días 3 al 6 del evento', 50, 3);

-- Fechas del evento provisionales (mes por confirmar): 14–19 de noviembre de 2026.
insert into public.fases (clave, nombre, tipo, corte_id, inicio, fin, permite_rotacion, es_evento, orden)
select v.clave, v.nombre, v.tipo::public.tipo_fase, c.id, v.inicio::date, v.fin::date, v.rot, v.evt, v.orden
from (values
  ('preparacion', 'Incorporación y preparación', 'evaluacion',    'c1',    null,         null,         false, false, 1),
  ('corte1',      'Corte 1',                     'recomendacion', 'c1',    null,         null,         false, false, 2),
  ('evento_d1_2', 'Evento — Días 1 y 2',         'evaluacion',    'c2',    '2026-11-14', '2026-11-15', true,  true,  3),
  ('corte2',      'Corte 2',                     'recomendacion', 'c2',    '2026-11-15', '2026-11-15', true,  false, 4),
  ('evento_d3_6', 'Evento — Días 3 al 6',        'evaluacion',    'final', '2026-11-16', '2026-11-19', true,  true,  5),
  ('cierre',      'Cierre y resultados',         'recomendacion', 'final', '2026-11-19', null,         false, false, 6)
) as v(clave, nombre, tipo, corte, inicio, fin, rot, evt, orden)
join public.cortes c on c.clave = v.corte;

insert into public.config (clave, valor, descripcion, provisional) values
  ('evento_inicio', '"2026-11-14"', 'Fecha del Día 1 del evento. El mes está por confirmar.', true),
  ('evento_dias', '6', 'Cantidad de días del evento (el instructivo dice 5; el rango 14–19 son 6).', true),
  ('metodo_promedio', '"simple"', 'Promedio por corte: "simple" o "ponderado_dias" (por días asignados).', false),
  ('pesos_dimension_confirmados', 'false', 'La Secretaría confirmó los pesos A–F definitivos.', true),
  ('evaluador_eyc', '"subsecretario"', 'Rol que evalúa a los miembros de EyC.', false);
