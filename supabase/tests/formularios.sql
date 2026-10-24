-- Pruebas de los formularios sin cuenta. Igual que reglas.sql: todo corre dentro de un bloque que termina en una excepción
-- controlada y no deja rastro. Resultado esperado: ERROR "FORMULARIOS_OK (n)".
do $$
declare
  u_eyc1 uuid := '00000000-0000-0000-0000-0000000000b1';
  u_eyc2 uuid := '00000000-0000-0000-0000-0000000000b2';
  u_sub  uuid := '00000000-0000-0000-0000-0000000000b3';
  u_sec  uuid := '00000000-0000-0000-0000-0000000000b4';
  c_ctd smallint; f uuid; cod text;
  k_nombre uuid; k_radio uuid; k_check uuid; k_escala uuid; k_siono uuid; k_solo_del uuid; k_parrafo uuid;
  n int; ok boolean; res jsonb; pruebas int := 0; v jsonb; vn numeric;
  f2 uuid; cod2 text; k_per uuid; p_a uuid; p_b uuid; p_otra uuid; k_dir smallint; k_adj smallint; c_pnud smallint;
begin
  select id into c_ctd from public.comisiones where clave = 'ctd';
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (u_eyc1, 'f-eyc1@prueba.test', jsonb_build_object('rol', 'eyc', 'comision_id', c_ctd), '{"nombre":"EyC Uno"}'),
    (u_eyc2, 'f-eyc2@prueba.test', jsonb_build_object('rol', 'eyc', 'comision_id', c_ctd), '{"nombre":"EyC Dos"}'),
    (u_sub,  'f-sub@prueba.test',  '{"rol":"subsecretario"}', '{"nombre":"Sub"}'),
    (u_sec,  'f-sec@prueba.test',  '{"rol":"secretario"}', '{"nombre":"Sec"}');

  -- 1. Cualquier rol crea un formulario; otro EyC no lo ve; Subse y Secretaría General sí.
  perform set_config('request.jwt.claims', json_build_object('sub', u_eyc1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.formularios (titulo, descripcion, roles) values ('Feedback de la sesión', 'Cuéntanos cómo fue', array['delegado', 'mesa', 'aprendiz'])
    returning id, codigo into f, cod;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, obligatorio) values (f, 1, 'texto', 'Tu nombre (opcional)', false) returning id into k_nombre;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, obligatorio, opciones) values (f, 2, 'radio', 'La mesa fue clara', true, '["Sí","Más o menos","No"]') returning id into k_radio;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, opciones) values (f, 3, 'checkbox', 'Qué funcionó', '["Tiempos","Trato","Reglas"]') returning id into k_check;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, obligatorio, escala_min, escala_max) values (f, 4, 'escala', 'Imparcialidad', true, 1, 5) returning id into k_escala;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta) values (f, 5, 'si_no', '¿Volverías a participar?') returning id into k_siono;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, obligatorio, roles) values (f, 6, 'parrafo', 'Qué mejorarías (solo delegados)', true, array['delegado']) returning id into k_solo_del;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', u_eyc2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.formularios; if n <> 0 then raise exception 'FALLO 1a: otro EyC ve el formulario ajeno'; end if;
  select count(*) into n from public.formulario_campos; if n <> 0 then raise exception 'FALLO 1b: otro EyC ve los campos ajenos'; end if;
  ok := false;
  begin update public.formularios set titulo = 'Cambiado' where id = f; get diagnostics n = row_count; ok := n = 0;
  exception when others then ok := true; end;
  if not ok then raise exception 'FALLO 1c: otro EyC editó un formulario ajeno'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_sec, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.formularios; if n <> 1 then raise exception 'FALLO 1d: la Secretaría General no ve el formulario'; end if;
  reset role;
  pruebas := pruebas + 1;

  -- 2. anon no lee ninguna tabla, pero sí puede abrir y responder el formulario público.
  set local role anon;
  ok := false; begin perform 1 from public.formularios limit 1; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALLO 2a: anon lee formularios'; end if;
  ok := false; begin perform 1 from public.formulario_respuestas limit 1; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALLO 2b: anon lee respuestas'; end if;
  ok := false; begin perform 1 from public.formulario_envios limit 1; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALLO 2c: anon lee envíos'; end if;
  v := public.formulario_publico(cod);
  if v ->> 'titulo' <> 'Feedback de la sesión' or jsonb_array_length(v -> 'campos') <> 6 then raise exception 'FALLO 2d: definición pública incorrecta'; end if;
  if v::text like '%creado_por%' or v::text like '%huella%' then raise exception 'FALLO 2e: la definición pública filtra datos internos'; end if;
  reset role;
  pruebas := pruebas + 1;

  -- 3. Envío válido de un delegado (con el campo exclusivo de delegados) y de un miembro de mesa (sin él).
  perform set_config('request.headers', '{"x-forwarded-for":"10.0.0.1","user-agent":"Prueba"}', true);
  set local role anon;
  perform public.formulario_enviar(cod, jsonb_build_object('rol', 'delegado', 'comision_id', c_ctd, 'referencia', 'Sesión 1', 'respuestas', jsonb_build_object(
    k_nombre::text, 'Ana', k_radio::text, 'Sí', k_check::text, jsonb_build_array('Tiempos', 'Trato'), k_escala::text, 4, k_siono::text, true, k_solo_del::text, 'Más tiempo')));
  perform public.formulario_enviar(cod, jsonb_build_object('rol', 'mesa', 'comision_id', c_ctd, 'referencia', 'Sesión 1', 'respuestas', jsonb_build_object(
    k_radio::text, 'Más o menos', k_escala::text, 2)));
  reset role;
  select count(*) into n from public.formulario_envios where formulario_id = f; if n <> 2 then raise exception 'FALLO 3a: envíos guardados = %', n; end if;
  select count(*) into n from public.formulario_respuestas where envio_id in (select id from public.formulario_envios where rol = 'mesa');
  if n <> 2 then raise exception 'FALLO 3b: la mesa guardó % respuestas (esperado 2: sin el campo de delegados)', n; end if;
  pruebas := pruebas + 1;

  -- 4. Validaciones del servidor.
  set local role anon;
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('rol', 'delegado', 'comision_id', c_ctd, 'referencia', 'S1', 'respuestas', jsonb_build_object(k_escala::text, 3)));
  exception when others then ok := sqlerrm like '%La mesa fue clara%'; end;
  if not ok then raise exception 'FALLO 4a: no exigió el campo obligatorio'; end if;
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('rol', 'delegado', 'comision_id', c_ctd, 'referencia', 'S1', 'respuestas', jsonb_build_object(k_radio::text, 'Sí', k_escala::text, 3)));
  exception when others then ok := sqlerrm like '%Qué mejorarías%'; end;
  if not ok then raise exception 'FALLO 4b: un delegado pudo omitir su campo obligatorio'; end if;
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('rol', 'mesa', 'comision_id', c_ctd, 'referencia', 'S1', 'respuestas', jsonb_build_object(k_radio::text, 'Tal vez', k_escala::text, 3)));
  exception when others then ok := sqlerrm like '%opción válida%'; end;
  if not ok then raise exception 'FALLO 4c: aceptó una opción que no existe'; end if;
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('rol', 'mesa', 'comision_id', c_ctd, 'referencia', 'S1', 'respuestas', jsonb_build_object(k_radio::text, 'Sí', k_escala::text, 9)));
  exception when others then ok := sqlerrm like '%escala%'; end;
  if not ok then raise exception 'FALLO 4d: aceptó un valor fuera de la escala'; end if;
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('rol', 'hacker', 'comision_id', c_ctd, 'referencia', 'S1', 'respuestas', '{}'));
  exception when others then ok := sqlerrm like '%quién eres%'; end;
  if not ok then raise exception 'FALLO 4e: aceptó un rol que el formulario no ofrece'; end if;
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('rol', 'mesa', 'referencia', 'S1', 'respuestas', jsonb_build_object(k_radio::text, 'Sí', k_escala::text, 3)));
  exception when others then ok := sqlerrm like '%comisión%'; end;
  if not ok then raise exception 'FALLO 4f: aceptó sin comisión'; end if;
  ok := false; begin perform public.formulario_enviar('no-existe', '{}');
  exception when others then ok := sqlerrm like '%no está disponible%'; end;
  if not ok then raise exception 'FALLO 4g: un código inexistente no falló'; end if;
  -- Trampa para bots: se ignora sin guardar nada.
  perform public.formulario_enviar(cod, jsonb_build_object('web', 'http://spam', 'rol', 'mesa', 'comision_id', c_ctd, 'referencia', 'S1', 'respuestas', jsonb_build_object(k_radio::text, 'Sí', k_escala::text, 3)));
  reset role;
  select count(*) into n from public.formulario_envios where formulario_id = f; if n <> 2 then raise exception 'FALLO 4h: los intentos inválidos dejaron % envíos', n; end if;
  pruebas := pruebas + 1;

  -- 5. Límite de envíos repetidos desde el mismo dispositivo (5 por 10 minutos).
  set local role anon;
  for i in 1..3 loop
    perform public.formulario_enviar(cod, jsonb_build_object('rol', 'mesa', 'comision_id', c_ctd, 'referencia', 'S2', 'respuestas', jsonb_build_object(k_radio::text, 'Sí', k_escala::text, 5)));
  end loop;
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('rol', 'mesa', 'comision_id', c_ctd, 'referencia', 'S2', 'respuestas', jsonb_build_object(k_radio::text, 'Sí', k_escala::text, 5)));
  exception when others then ok := sqlerrm like '%Espera unos minutos%'; end;
  if not ok then raise exception 'FALLO 5a: no limitó los envíos repetidos'; end if;
  -- Otro dispositivo sí puede enviar.
  perform set_config('request.headers', '{"x-forwarded-for":"10.0.0.2","user-agent":"Otra"}', true);
  perform public.formulario_enviar(cod, jsonb_build_object('rol', 'mesa', 'comision_id', c_ctd, 'referencia', 'S2', 'respuestas', jsonb_build_object(k_radio::text, 'No', k_escala::text, 1)));
  reset role;
  pruebas := pruebas + 1;

  -- 6. Resultados: quien lo creó los ve; otro EyC no; los cálculos los hace la base.
  perform set_config('request.jwt.claims', json_build_object('sub', u_eyc1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := public.formulario_resultados(f);
  if (res ->> 'envios')::int <> 6 then raise exception 'FALLO 6a: envíos = %', res ->> 'envios'; end if;
  -- Escala: 4, 2, 5, 5, 5, 1 → promedio 3.67
  select (c -> 'resumen' ->> 'promedio')::numeric into vn from jsonb_array_elements(res -> 'campos') c where c ->> 'etiqueta' = 'Imparcialidad';
  if vn is distinct from 3.67 then raise exception 'FALLO 6b: promedio de la escala = %', vn; end if;
  select (c -> 'resumen' ->> 'Sí')::int into n from jsonb_array_elements(res -> 'campos') c where c ->> 'etiqueta' = 'La mesa fue clara';
  if n <> 4 then raise exception 'FALLO 6c: votos «Sí» = %', n; end if;
  select (c -> 'resumen' ->> 'Trato')::int into n from jsonb_array_elements(res -> 'campos') c where c ->> 'etiqueta' = 'Qué funcionó';
  if n <> 1 then raise exception 'FALLO 6d: casillas «Trato» = %', n; end if;
  if (res -> 'por_rol' ->> 'mesa')::int <> 5 or (res -> 'por_rol' ->> 'delegado')::int <> 1 then raise exception 'FALLO 6e: por rol = %', res -> 'por_rol'; end if;
  select count(*) into n from public.formulario_respuestas; if n = 0 then raise exception 'FALLO 6f: el creador no ve las respuestas'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_eyc2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.formulario_respuestas; if n <> 0 then raise exception 'FALLO 6g: otro EyC lee respuestas ajenas'; end if;
  res := public.formulario_resultados(f);
  if (res ->> 'envios')::int <> 0 then raise exception 'FALLO 6h: otro EyC obtuvo resultados ajenos'; end if;
  reset role;
  pruebas := pruebas + 1;

  -- 7. Un campo con respuestas no se borra (se desactiva) y deja de aparecer en el formulario público.
  perform set_config('request.jwt.claims', json_build_object('sub', u_eyc1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  ok := false; begin delete from public.formulario_campos where id = k_radio; exception when foreign_key_violation or restrict_violation then ok := true; end;
  if not ok then raise exception 'FALLO 7a: se borró un campo con respuestas'; end if;
  update public.formulario_campos set activo = false where id = k_siono;
  reset role;
  set local role anon;
  v := public.formulario_publico(cod);
  if jsonb_array_length(v -> 'campos') <> 5 then raise exception 'FALLO 7b: el campo desactivado sigue visible'; end if;
  reset role;
  -- Un formulario desactivado deja de recibir respuestas.
  perform set_config('request.jwt.claims', json_build_object('sub', u_eyc1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.formularios set activo = false where id = f;
  reset role;
  perform set_config('request.headers', '{"x-forwarded-for":"10.0.0.3","user-agent":"Nueva"}', true);
  set local role anon;
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('rol', 'mesa', 'comision_id', c_ctd, 'referencia', 'S3', 'respuestas', jsonb_build_object(k_radio::text, 'Sí', k_escala::text, 3)));
  exception when others then ok := sqlerrm like '%no está disponible%'; end;
  if not ok then raise exception 'FALLO 7c: un formulario desactivado recibió respuestas'; end if;
  reset role;
  pruebas := pruebas + 1;

  -- 8. Auditoría de la creación del formulario.
  select count(*) into n from public.auditoria where tabla = 'formularios' and autor = u_eyc1 and accion = 'insert';
  if n <> 1 then raise exception 'FALLO 8: auditoría del formulario = %', n; end if;
  pruebas := pruebas + 1;

  -- 9. Campo «personas»: se elige a alguien registrado en la comisión (o «Otro» si es externo); nunca de otra comisión.
  select id into k_dir from public.cargos where clave = 'director';
  select id into k_adj from public.cargos where clave = 'adjunto1';
  select id into c_pnud from public.comisiones where clave = 'pnud';
  insert into public.personas (nombre, ambito) values ('Ana Ponente', 'mesa') returning id into p_a;
  insert into public.personas (nombre, ambito) values ('Beto Ponente', 'mesa') returning id into p_b;
  insert into public.personas (nombre, ambito) values ('Carla de Otra Comisión', 'mesa') returning id into p_otra;
  insert into public.asignaciones (persona_id, comision_id, cargo_id, desde, motivo) values
    (p_a, c_ctd, k_dir, now() - interval '30 days', 'inicial'), (p_b, c_ctd, k_adj, now() - interval '30 days', 'inicial'),
    (p_otra, c_pnud, k_dir, now() - interval '30 days', 'inicial');
  perform set_config('request.jwt.claims', json_build_object('sub', u_eyc1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.formularios (titulo, roles) values ('Feedback del taller', array['delegado']) returning id, codigo into f2, cod2;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, obligatorio) values (f2, 1, 'personas', '¿Quién dio el taller?', true) returning id into k_per;
  reset role;
  perform set_config('request.headers', '{"x-forwarded-for":"10.0.0.9","user-agent":"Personas"}', true);
  set local role anon;
  v := public.formulario_personas(cod2, c_ctd);
  if jsonb_array_length(v) <> 2 or v::text like '%Otra Comisión%' then raise exception 'FALLO 9a: personas de la comisión = %', v; end if;
  if (v -> 0) ? 'correo' or (v -> 0) ? 'telefono' then raise exception 'FALLO 9b: expone datos de contacto'; end if;
  perform public.formulario_enviar(cod2, jsonb_build_object('rol', 'delegado', 'comision_id', c_ctd, 'referencia', 'Taller 1',
    'respuestas', jsonb_build_object(k_per::text, jsonb_build_object('persona_id', p_a))));
  perform public.formulario_enviar(cod2, jsonb_build_object('rol', 'delegado', 'comision_id', c_ctd, 'referencia', 'Taller 1',
    'respuestas', jsonb_build_object(k_per::text, jsonb_build_object('otro', 'Invitado externo'))));
  ok := false; begin perform public.formulario_enviar(cod2, jsonb_build_object('rol', 'delegado', 'comision_id', c_ctd, 'referencia', 'Taller 1',
    'respuestas', jsonb_build_object(k_per::text, jsonb_build_object('persona_id', p_otra))));
  exception when others then ok := sqlerrm like '%persona de la comisión%'; end;
  if not ok then raise exception 'FALLO 9d: aceptó a una persona de otra comisión'; end if;
  ok := false; begin perform public.formulario_enviar(cod2, jsonb_build_object('rol', 'delegado', 'comision_id', c_ctd, 'referencia', 'Taller 1', 'respuestas', '{}'::jsonb));
  exception when others then ok := sqlerrm like '%Falta responder%'; end;
  if not ok then raise exception 'FALLO 9e: no exigió el campo de personas obligatorio'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u_eyc1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := public.formulario_resultados(f2);
  select c -> 'resumen' into v from jsonb_array_elements(res -> 'campos') c where c ->> 'tipo' = 'personas';
  if (v -> 'conteo' ->> 'Ana Ponente')::int <> 1 or v -> 'otros' <> '["Invitado externo"]'::jsonb then raise exception 'FALLO 9f: resumen de personas = %', v; end if;
  reset role;
  pruebas := pruebas + 1;

  raise exception 'FORMULARIOS_OK (%)', pruebas;
end $$;
