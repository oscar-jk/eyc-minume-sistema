// Gestión de cuentas individuales (solo rol admin).
// La llave de servicio vive únicamente aquí, en el servidor; nunca en el cliente.
//
// POST { accion: "crear", email, nombre, rol, comision_id?, persona_id?, redirect_to }
//   → crea la cuenta (sin contraseña conocida) y devuelve un enlace para que la persona defina la suya.
// POST { accion: "enlace", email, redirect_to }   → nuevo enlace de acceso / recuperación.
// POST { accion: "activar", user_id, activo }     → activa o bloquea la cuenta.
// POST { accion: "correo", user_id, email }       → cambia el correo si la cuenta aún no se activó.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLES = ["eyc", "subsecretario", "secretario", "admin"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Quién llama: debe ser un perfil admin activo.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: caller, error: authErr } = await service.auth.getUser(token);
  if (authErr || !caller.user) return json({ error: "Sesión inválida" }, 401);
  const { data: perfil } = await service.from("perfiles").select("rol, activo").eq("id", caller.user.id).single();
  if (!perfil || perfil.rol !== "admin" || !perfil.activo) return json({ error: "Solo un administrador puede gestionar cuentas" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const redirectTo = typeof body.redirect_to === "string" ? body.redirect_to : undefined;

  const enlace = async (email: string) => {
    const { data, error } = await service.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
    if (error) throw error;
    return data.properties.action_link;
  };

  try {
    switch (body.accion) {
      case "crear": {
        const email = String(body.email ?? "").trim().toLowerCase();
        const nombre = String(body.nombre ?? "").trim();
        const rol = String(body.rol ?? "");
        const comision = body.comision_id ? Number(body.comision_id) : null;
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Correo inválido" }, 400);
        if (nombre.length < 2) return json({ error: "Nombre requerido" }, 400);
        if (!ROLES.includes(rol)) return json({ error: "Rol inválido" }, 400);
        if (rol === "eyc" && !comision) return json({ error: "Una cuenta de EyC necesita comisión" }, 400);

        const password = crypto.randomUUID() + crypto.randomUUID(); // nadie la conoce; se define con el enlace
        const { data, error } = await service.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nombre },
          app_metadata: { rol, comision_id: comision },
        });
        if (error) return json({ error: error.message.includes("already") ? "Ya existe una cuenta con ese correo" : error.message }, 400);
        if (body.persona_id) {
          await service.from("perfiles").update({ persona_id: String(body.persona_id) }).eq("id", data.user.id);
        }
        return json({ user_id: data.user.id, enlace: await enlace(email) });
      }
      case "enlace": {
        const email = String(body.email ?? "").trim().toLowerCase();
        return json({ enlace: await enlace(email) });
      }
      case "activar": {
        const userId = String(body.user_id ?? "");
        const activo = Boolean(body.activo);
        if (userId === caller.user.id && !activo) return json({ error: "No puedes bloquear tu propia cuenta" }, 400);
        const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: activo ? "none" : "876000h" });
        if (error) return json({ error: error.message }, 400);
        await service.from("perfiles").update({ activo }).eq("id", userId);
        return json({ ok: true });
      }
      case "correo": {
        // Cambiar el correo solo mientras la cuenta no se haya activado (la persona aún no entró ni definió contraseña).
        const userId = String(body.user_id ?? "");
        const email = String(body.email ?? "").trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Correo inválido" }, 400);
        const { data: u, error: eu } = await service.auth.admin.getUserById(userId);
        if (eu || !u.user) return json({ error: "Cuenta no encontrada" }, 404);
        if (u.user.last_sign_in_at) return json({ error: "La persona ya activó su cuenta; su correo no se puede cambiar." }, 409);
        const { error } = await service.auth.admin.updateUserById(userId, { email, email_confirm: true });
        if (error) return json({ error: error.message.includes("already") ? "Ya existe una cuenta con ese correo" : error.message }, 400);
        return json({ ok: true, enlace: await enlace(email) });
      }
      default:
        return json({ error: "Acción desconocida" }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error inesperado" }, 500);
  }
});
