-- Modo mantenimiento. Resultado esperado: ERROR "MANTENIMIENTO_OK (n)".
do $$
declare r jsonb; ok boolean;
begin
  -- Viene apagado y lo puede leer cualquiera, incluso sin sesión.
  set local role anon;
  r := public.estado_sitio();
  if (r ->> 'mantenimiento')::boolean then raise exception 'FALLO 1a: el modo mantenimiento no debe venir activo'; end if;
  ok := false; begin perform 1 from public.config limit 1; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALLO 1b: anon lee la tabla config'; end if;
  reset role;
  -- Al activarlo, lo ve cualquiera con el mensaje, pero sin exponer el resto de la configuración.
  update public.config set valor = '{"activo": true, "mensaje": "Volvemos en unos minutos"}' where clave = 'mantenimiento';
  set local role anon;
  r := public.estado_sitio();
  if not (r ->> 'mantenimiento')::boolean or r ->> 'mensaje' <> 'Volvemos en unos minutos' then raise exception 'FALLO 2: estado = %', r; end if;
  if (select count(*) from jsonb_object_keys(r)) <> 2 then raise exception 'FALLO 2b: expone más de lo necesario (%)', r; end if;
  reset role;
  raise exception 'MANTENIMIENTO_OK (2)';
end $$;
