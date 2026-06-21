import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "No autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "Falta token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authedClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await authedClient.auth.getUser(jwt);
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ ok: false, error: "Sesión no válida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: inv } = await admin.from("invitations").select("id, status, expires_at").eq("token", token).maybeSingle();
    if (!inv || inv.status !== "pending" || new Date(inv.expires_at) < new Date()) {
      return new Response(JSON.stringify({ ok: false, error: "Invitación no válida" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { error: updateErr } = await admin.from("invitations").update({ status: "used", used_by: userId, used_at: new Date().toISOString() }).eq("id", inv.id);
    if (updateErr) {
      console.error("consume invitation update error", updateErr);
      return new Response(JSON.stringify({ ok: false, error: "No se pudo actualizar la invitación" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("consume-invitation fatal", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
