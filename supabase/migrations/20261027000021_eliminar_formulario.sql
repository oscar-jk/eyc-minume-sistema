-- 021 · Eliminar un formulario con respuestas. Las respuestas apuntan a sus preguntas con «restrict» (para no perder datos al quitar
--       una pregunta suelta), y por eso el borrado directo del formulario fallaba en cuanto tenía respuestas.
--       Esta función borra primero los envíos (y con ellos sus respuestas) y luego el formulario, en una sola operación.
--       Corre con los permisos de quien la llama: solo quien creó el formulario, la Subsecretaría y la administración pueden borrarlo.
create or replace function public.eliminar_formulario(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare n int;
begin
  delete from public.formulario_envios where formulario_id = p_id;
  delete from public.formularios where id = p_id;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'No se pudo eliminar el formulario.' using errcode = '42501'; end if;
end $$;
revoke all on function public.eliminar_formulario(uuid) from public, anon;
grant execute on function public.eliminar_formulario(uuid) to authenticated;
