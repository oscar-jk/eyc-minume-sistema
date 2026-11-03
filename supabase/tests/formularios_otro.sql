-- Formularios: sección (no se responde) y opción «Otro: …». Resultado esperado: ERROR "FORM_OTRO_OK (n)".
do $$
declare
  u uuid := '00000000-0000-0000-0000-0000000000a1';
  f uuid; cod text; k_sec uuid; k_radio uuid; k_check uuid; k_sin uuid; res jsonb; v jsonb; ok boolean; n int; campo jsonb; copia uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values (u, 'o-sub@prueba.test', '{"rol":"subsecretario"}', '{"nombre":"Sub"}');
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.formularios (titulo, roles, pide_comision, pide_referencia) values ('Con secciones y otro', '{}', false, false) returning id, codigo into f, cod;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, ayuda) values (f, 1, 'seccion', 'PARTE 1', 'Lee con calma') returning id into k_sec;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, obligatorio, opciones, con_otro) values (f, 2, 'radio', 'Calidad', true, '["Delegado"]', true) returning id into k_radio;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, opciones, con_otro) values (f, 3, 'checkbox', 'Materiales', '["Videos","Guías"]', true) returning id into k_check;
  insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, opciones, con_otro) values (f, 4, 'radio', 'Sin otro', '["Sí","No"]', false) returning id into k_sin;
  -- «Otro» solo existe en opción única y casillas.
  ok := false;
  begin insert into public.formulario_campos (formulario_id, orden, tipo, etiqueta, con_otro) values (f, 5, 'texto', 'Texto', true); exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALLO 1: con_otro permitido en un campo de texto'; end if;
  reset role;

  -- 2. La página pública manda la sección y la marca «Otro».
  set local role anon;
  v := public.formulario_publico(cod);
  if (select count(*) from jsonb_array_elements(v -> 'campos') c where c ->> 'tipo' = 'seccion') <> 1 then raise exception 'FALLO 2a: falta la sección'; end if;
  if not (select (c ->> 'con_otro')::boolean from jsonb_array_elements(v -> 'campos') c where c ->> 'etiqueta' = 'Calidad') then raise exception 'FALLO 2b: falta con_otro'; end if;

  -- 3. Se responde con una opción de la lista, con «Otro: …», y se rechaza lo inválido.
  perform public.formulario_enviar(cod, jsonb_build_object('respuestas', jsonb_build_object(k_radio::text, 'Delegado', k_check::text, jsonb_build_array('Videos', 'Otro: Podcasts'), k_sin::text, 'Sí')));
  perform public.formulario_enviar(cod, jsonb_build_object('respuestas', jsonb_build_object(k_radio::text, 'Otro: Observador', k_sin::text, 'No')));
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('respuestas', jsonb_build_object(k_radio::text, 'Cualquier cosa'))); exception when others then ok := true; end;
  if not ok then raise exception 'FALLO 3a: aceptó un texto libre sin el prefijo Otro'; end if;
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('respuestas', jsonb_build_object(k_radio::text, 'Delegado', k_sin::text, 'Otro: Talvez'))); exception when others then ok := true; end;
  if not ok then raise exception 'FALLO 3b: aceptó «Otro» en un campo que no lo permite'; end if;
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('respuestas', jsonb_build_object(k_radio::text, 'Otro: '))); exception when others then ok := true; end;
  if not ok then raise exception 'FALLO 3c: aceptó «Otro» vacío'; end if;
  ok := false; begin perform public.formulario_enviar(cod, jsonb_build_object('respuestas', jsonb_build_object(k_radio::text, 'Delegado', k_check::text, jsonb_build_array('Otro: A', 'Otro: B')))); exception when others then ok := true; end;
  if not ok then raise exception 'FALLO 3d: aceptó dos «Otro» en casillas'; end if;
  -- Un valor para la sección se ignora (no se guarda).
  perform public.formulario_enviar(cod, jsonb_build_object('respuestas', jsonb_build_object(k_radio::text, 'Delegado', k_sec::text, 'hackeo')));
  reset role;
  select count(*) into n from public.formulario_respuestas where campo_id = k_sec; if n <> 0 then raise exception 'FALLO 3e: se guardó una respuesta de sección'; end if;
  select count(*) into n from public.formulario_envios where formulario_id = f; if n <> 3 then raise exception 'FALLO 3f: envíos = % (se esperaban 3)', n; end if;

  -- 4. Resultados: sin la sección y con los «Otro» aparte.
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := public.formulario_resultados(f);
  if jsonb_array_length(res -> 'campos') <> 3 then raise exception 'FALLO 4a: campos en resultados = %', jsonb_array_length(res -> 'campos'); end if;
  select c into campo from jsonb_array_elements(res -> 'campos') c where c ->> 'etiqueta' = 'Calidad';
  if campo -> 'otros' <> '["Observador"]'::jsonb then raise exception 'FALLO 4b: otros de la opción única = %', campo -> 'otros'; end if;
  if (campo -> 'resumen' ->> 'Delegado')::int <> 2 then raise exception 'FALLO 4c: conteo de Delegado = %', campo -> 'resumen'; end if;
  select c into campo from jsonb_array_elements(res -> 'campos') c where c ->> 'etiqueta' = 'Materiales';
  if campo -> 'otros' <> '["Podcasts"]'::jsonb then raise exception 'FALLO 4d: otros de las casillas = %', campo -> 'otros'; end if;
  select c into campo from jsonb_array_elements(res -> 'campos') c where c ->> 'etiqueta' = 'Sin otro';
  if campo -> 'otros' <> 'null'::jsonb then raise exception 'FALLO 4e: un campo sin Otro trae lista de otros'; end if;

  -- 5. Duplicar conserva la sección y «Otro».
  copia := public.duplicar_formulario(f);
  select count(*) into n from public.formulario_campos where formulario_id = copia and tipo = 'seccion'; if n <> 1 then raise exception 'FALLO 5a: la copia perdió la sección'; end if;
  select count(*) into n from public.formulario_campos where formulario_id = copia and con_otro; if n <> 2 then raise exception 'FALLO 5b: la copia perdió «Otro» (%)', n; end if;
  reset role;
  raise exception 'FORM_OTRO_OK (5)';
end $$;
