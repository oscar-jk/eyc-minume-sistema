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
