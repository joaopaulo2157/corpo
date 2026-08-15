import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const configuredSiteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const emailPattern = /^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedAdminRoles = new Set(["master", "recepcao", "professor"]);
const allowedStudentStatus = new Set(["Ativo", "Bloqueado", "Pendente"]);

function clean(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigins = new Set([
    configuredSiteUrl,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean));
  const allowedOrigin = allowedOrigins.has(origin) ? origin : configuredSiteUrl;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function respond(request: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function authenticate(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile, error: profileError } = await admin
    .from("admin_profiles")
    .select("user_id, nivel, ativo")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile?.ativo) return null;
  return { user, profile };
}

function safeRedirect(requested: unknown): string | undefined {
  if (!configuredSiteUrl) return undefined;
  try {
    const url = new URL(clean(requested, 500) || `${configuredSiteUrl}/login-cliente.html`);
    return url.origin === new URL(configuredSiteUrl).origin
      ? url.href
      : `${configuredSiteUrl}/login-cliente.html`;
  } catch {
    return `${configuredSiteUrl}/login-cliente.html`;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return respond(request, 405, { error: "Método não permitido." });
  if (!supabaseUrl || !serviceRoleKey) return respond(request, 500, { error: "Função não configurada." });
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 20_000) {
    return respond(request, 413, { error: "Requisição muito grande." });
  }

  const identity = await authenticate(request);
  if (!identity) return respond(request, 401, { error: "Sessão inválida." });

  let body: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 20_000) return respond(request, 413, { error: "Requisição muito grande." });
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return respond(request, 400, { error: "JSON inválido." });
  }

  const action = clean(body.action, 40);
  const isMaster = identity.profile.nivel === "master";
  const canManageStudents = isMaster || identity.profile.nivel === "recepcao";

  try {
    if (["create", "update", "delete"].includes(action)) {
      if (!isMaster) return respond(request, 403, { error: "Apenas o master pode gerenciar administradores." });

      const userId = clean(body.user_id, 36);
      const nome = clean(body.nome, 120);
      const email = clean(body.email, 254).toLowerCase();
      const password = clean(body.password, 128);
      const nivel = clean(body.nivel, 20);

      if (action === "delete") {
        if (!uuidPattern.test(userId) || userId === identity.user.id) {
          return respond(request, 400, { error: "Usuário inválido ou tentativa de autoexclusão." });
        }
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
        return respond(request, 200, { ok: true });
      }

      if (nome.length < 2 || !emailPattern.test(email) || !allowedAdminRoles.has(nivel)) {
        return respond(request, 400, { error: "Dados administrativos inválidos." });
      }

      if (action === "create") {
        if (password.length < 12) return respond(request, 400, { error: "A senha deve ter pelo menos 12 caracteres." });
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: nome },
        });
        if (error || !data.user) throw error ?? new Error("Usuário não criado.");

        const { error: profileError } = await admin.from("admin_profiles").insert({
          user_id: data.user.id,
          nome,
          email,
          nivel,
          ativo: true,
        });
        if (profileError) {
          await admin.auth.admin.deleteUser(data.user.id);
          throw profileError;
        }
        return respond(request, 201, { ok: true, user_id: data.user.id });
      }

      if (!uuidPattern.test(userId)) return respond(request, 400, { error: "Usuário inválido." });
      if (userId === identity.user.id && nivel !== "master") {
        return respond(request, 400, { error: "O master atual não pode remover a própria função." });
      }
      if (password && password.length < 12) {
        return respond(request, 400, { error: "A senha deve ter pelo menos 12 caracteres." });
      }
      const authPatch = password
        ? { email, password, user_metadata: { full_name: nome } }
        : { email, user_metadata: { full_name: nome } };
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, authPatch);
      if (authUpdateError) throw authUpdateError;
      const { error: profileUpdateError } = await admin
        .from("admin_profiles")
        .update({ nome, email, nivel, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (profileUpdateError) throw profileUpdateError;
      return respond(request, 200, { ok: true });
    }

    if (["create_student", "update_student", "delete_student"].includes(action)) {
      if (!canManageStudents) return respond(request, 403, { error: "Acesso insuficiente para gerenciar alunos." });

      const studentId = clean(body.student_id, 128);
      if (action === "delete_student") {
        if (!studentId) return respond(request, 400, { error: "Aluno inválido." });
        const { data: student, error: findError } = await admin
          .from("alunos")
          .select("auth_user_id")
          .eq("id", studentId)
          .maybeSingle();
        if (findError) throw findError;
        const { error: deleteRowError } = await admin.from("alunos").delete().eq("id", studentId);
        if (deleteRowError) throw deleteRowError;
        if (student?.auth_user_id) await admin.auth.admin.deleteUser(student.auth_user_id);
        return respond(request, 200, { ok: true });
      }

      const nome = clean(body.nome, 120);
      const email = clean(body.email, 254).toLowerCase();
      const tel = clean(body.tel, 30);
      const plano = clean(body.plano, 120);
      const status = clean(body.status, 20);
      if (nome.length < 3 || !emailPattern.test(email) || tel.length < 10 || !plano || !allowedStudentStatus.has(status)) {
        return respond(request, 400, { error: "Dados do aluno inválidos." });
      }

      if (action === "create_student") {
        const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: safeRedirect(body.redirect_to),
          data: { full_name: nome },
        });
        if (inviteError || !invite.user) throw inviteError ?? new Error("Convite não enviado.");
        const { error: insertError } = await admin.from("alunos").insert({
          nome, email, tel, plano, status, auth_user_id: invite.user.id,
        });
        if (insertError) {
          await admin.auth.admin.deleteUser(invite.user.id);
          throw insertError;
        }
        return respond(request, 201, { ok: true, user_id: invite.user.id });
      }

      if (!studentId) return respond(request, 400, { error: "Aluno inválido." });
      const { data: current, error: currentError } = await admin
        .from("alunos")
        .select("auth_user_id")
        .eq("id", studentId)
        .maybeSingle();
      if (currentError || !current) throw currentError ?? new Error("Aluno não encontrado.");

      let authUserId = current.auth_user_id as string | null;
      let invitedDuringUpdate = false;
      if (!authUserId) {
        const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: safeRedirect(body.redirect_to),
          data: { full_name: nome },
        });
        if (inviteError || !invite.user) throw inviteError ?? new Error("Convite não enviado.");
        authUserId = invite.user.id;
        invitedDuringUpdate = true;
      } else {
        const { error: updateAuthError } = await admin.auth.admin.updateUserById(authUserId, {
          email,
          user_metadata: { full_name: nome },
        });
        if (updateAuthError) throw updateAuthError;
      }

      const { error: updateError } = await admin
        .from("alunos")
        .update({ nome, email, tel, plano, status, auth_user_id: authUserId })
        .eq("id", studentId);
      if (updateError) {
        if (invitedDuringUpdate && authUserId) await admin.auth.admin.deleteUser(authUserId);
        throw updateError;
      }
      return respond(request, 200, { ok: true });
    }

    return respond(request, 400, { error: "Ação inválida." });
  } catch (error) {
    console.error("admin-users failure", error instanceof Error ? error.message : "unknown");
    return respond(request, 400, { error: "A operação não pôde ser concluída." });
  }
});
