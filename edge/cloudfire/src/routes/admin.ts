/**
 * WPipe Studio - Super-Admin Route Handlers (Option A)
 * Exclusively for William Rodriguez (localhost:8502 Super-Admin Console)
 * Protected by ADMIN_MASTER_KEY / Cloudflare API Token
 * Author: William Rodriguez (wisrovi.dev)
 */

import { Env } from "./activate";

function base64UrlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let output = str.replace(/-/g, "+").replace(/_/g, "/");
  while (output.length % 4) output += "=";
  return decodeURIComponent(escape(atob(output)));
}

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generate6DigitOtp(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const code = 100000 + (buf[0] % 900000);
  return code.toString();
}

async function createSuperAdminJwt(email: string, masterKey: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + 86400; // 24 hours
  const payload = base64UrlEncode(JSON.stringify({ email: email.toLowerCase(), role: "superadmin", exp }));
  const dataToSign = `${header}.${payload}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(masterKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(dataToSign));
  const sigStr = Array.from(new Uint8Array(signature))
    .map((b) => String.fromCharCode(b))
    .join("");
  const b64Signature = btoa(sigStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${dataToSign}.${b64Signature}`;
}

async function verifySuperAdminJwt(token: string, masterKey: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, sigB64] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(masterKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    let sigStr = atob(sigB64.replace(/-/g, "+").replace(/_/g, "/"));
    const sigBytes = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) sigBytes[i] = sigStr.charCodeAt(i);

    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(dataToSign));
    if (!valid) return false;

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;
    if (payload.role !== "superadmin") return false;
    return true;
  } catch {
    return false;
  }
}

async function sendSuperAdminEmail(code: string, resendApiKey?: string): Promise<{ success: boolean; reason?: string }> {
  if (!resendApiKey) return { success: false, reason: "NO_RESEND_API_KEY" };
  const targetEmail = "wisrovi.rodriguez@gmail.com";
  const senders = ["WPipe Studio Security <security@wisrovi.dev>", "WPipe Studio <onboarding@resend.dev>"];

  for (const from of senders) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [targetEmail],
          subject: "🛡️ Código de Autenticación Super-Admin — WPipe Studio",
          html: `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
            <h2 style="color: #6366f1; margin-top: 0;">🛡️ WPipe Studio — Super-Admin</h2>
            <p style="color: #94a3b8; font-size: 14px;">Has solicitado acceso a la consola de administración soberana (admin.wisrovi.dev). Tu código de un solo uso es:</p>
            <div style="background: #1e293b; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #38bdf8;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 12px; line-height: 1.5;">Válido durante 10 minutos. No compartas este código con nadie.</p>
            <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
            <p style="color: #475569; font-size: 11px; text-align: center;">WPipe Studio Authority &copy; 2026 wisrovi.dev</p>
          </div>`,
        }),
      });
      if (resp.ok) return { success: true };
    } catch (e) {}
  }
  return { success: false, reason: "EMAIL_FAILED" };
}


function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function isAuthorizedAdmin(request: Request, env: Env): Promise<boolean> {
  const masterKey = env.ADMIN_MASTER_KEY?.trim();
  if (!masterKey) return false;

  const auth = request.headers.get("Authorization");
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (constantTimeEquals(token, masterKey)) return true;
    const isJwtValid = await verifySuperAdminJwt(token, masterKey);
    if (isJwtValid) return true;
  }
  const headerKey = request.headers.get("x-admin-key");
  if (headerKey && constantTimeEquals(headerKey.trim(), masterKey)) return true;
  return false;
}

export async function handleAdmin(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  const masterKey = env.ADMIN_MASTER_KEY?.trim();

  // 0.1 POST /v1/admin/auth/send-otp (Send OTP to Official Email)
  if (path === "/v1/admin/auth/send-otp" && request.method === "POST") {
    let body: any = {};
    try { body = await request.json(); } catch {}
    const providedKey = (body.master_key || "").trim();

    if (!masterKey || !providedKey || !constantTimeEquals(providedKey, masterKey)) {
      return new Response(
        JSON.stringify({ error: "INVALID_MASTER_KEY", message: "Clave maestra no válida." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const email = "wisrovi.rodriguez@gmail.com";
    const code = generate6DigitOtp();
    const codeHash = await hashCode(code);
    const otpId = `otp_admin_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    await env.DB.prepare(
      `INSERT INTO otp_codes (id, email, code_hash, attempts, expires_at, used, created_at)
       VALUES (?, ?, ?, 0, datetime('now', '+10 minutes'), 0, datetime('now'))`
    ).bind(otpId, email, codeHash).run();

    const emailResult = await sendSuperAdminEmail(code, (env as any).RESEND_API_KEY);

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Código de seguridad de 6 dígitos enviado a tu correo.",
        masked_email: "wi********@gmail.com",
        delivery: emailResult.success ? "sent" : "dev_fallback",
        dev_code: emailResult.success ? undefined : code,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // 0.2 POST /v1/admin/auth/verify-otp (Verify OTP & Issue Session JWT)
  if (path === "/v1/admin/auth/verify-otp" && request.method === "POST") {
    let body: any = {};
    try { body = await request.json(); } catch {}
    const providedKey = (body.master_key || "").trim();
    const providedCode = (body.otp_code || "").trim();

    if (!masterKey || !providedKey || !constantTimeEquals(providedKey, masterKey)) {
      return new Response(
        JSON.stringify({ error: "INVALID_MASTER_KEY", message: "Clave maestra no válida." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!providedCode || providedCode.length !== 6) {
      return new Response(
        JSON.stringify({ error: "INVALID_CODE", message: "El código debe tener 6 dígitos." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const email = "wisrovi.rodriguez@gmail.com";
    const codeHash = await hashCode(providedCode);

    const record: any = await env.DB.prepare(
      `SELECT id, code_hash, attempts, expires_at, used
       FROM otp_codes
       WHERE email = ? AND used = 0
       ORDER BY created_at DESC
       LIMIT 1`
    ).bind(email).first();

    if (!record) {
      return new Response(
        JSON.stringify({ error: "CODE_NOT_FOUND", message: "No hay ningún código pendiente o ha expirado." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ error: "CODE_EXPIRED", message: "El código ha expirado. Solicita uno nuevo." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (record.code_hash !== codeHash) {
      await env.DB.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?").bind(record.id).run();
      return new Response(
        JSON.stringify({ error: "CODE_MISMATCH", message: "Código de verificación incorrecto." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    await env.DB.prepare("UPDATE otp_codes SET used = 1 WHERE id = ?").bind(record.id).run();

    const sessionToken = await createSuperAdminJwt(email, masterKey);

    return new Response(
      JSON.stringify({
        status: "success",
        authorized: true,
        session_token: sessionToken,
        admin_name: "William Rodriguez",
        email: email,
        role: "Super-Admin",
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // 0.3 POST /v1/admin/auth/verify (Legacy / Session Check)
  if (path === "/v1/admin/auth/verify" && request.method === "POST") {
    if (!masterKey) {
      return new Response(
        JSON.stringify({ error: "CONFIG_ERROR", message: "Clave maestra de Super-Admin no configurada en el servidor." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let body: any = {};
    try { body = await request.json(); } catch {}
    const providedKey = (body.master_key || body.key || body.token || "").trim();
    const authorized = (providedKey && constantTimeEquals(providedKey, masterKey)) || (providedKey && await verifySuperAdminJwt(providedKey, masterKey)) || await isAuthorizedAdmin(request, env);

    if (authorized) {
      return new Response(
        JSON.stringify({
          status: "success",
          authorized: true,
          admin_name: "William Rodriguez",
          role: "Super-Admin",
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "UNAUTHORIZED", message: "Sesión o credencial de Super-Admin no válida." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const isAuth = await isAuthorizedAdmin(request, env);
  if (!isAuth) {
    return new Response(
      JSON.stringify({ error: "FORBIDDEN", message: "Acceso no autorizado al panel Super-Admin." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // 1. POST /v1/admin/sql (Direct D1 SQL Execution Console)
  if (path === "/v1/admin/sql" && request.method === "POST") {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "INVALID_JSON_BODY" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { sql, params } = body;
    if (!sql || typeof sql !== "string") {
      return new Response(JSON.stringify({ error: "MISSING_SQL_QUERY" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const stmt = env.DB.prepare(sql);
      const boundStmt = params && Array.isArray(params) ? stmt.bind(...params) : stmt;
      const result = await boundStmt.all();

      return new Response(
        JSON.stringify({
          success: true,
          results: result.results || [],
          meta: result.meta,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (e: any) {
      return new Response(
        JSON.stringify({ error: "SQL_EXECUTION_ERROR", message: e.message || String(e) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 2. POST /v1/admin/licenses/vip (Master License Minter)
  if (path === "/v1/admin/licenses/vip" && request.method === "POST") {
    const body: any = await request.json();
    const {
      customer_email,
      customer_name,
      plan = "enterprise",
      max_seats = 5,
      expires_at = null,
      custom_key,
    } = body;

    const licenseId = `lic_vip_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const finalKey = (custom_key || `WPIPE-VIP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`).trim().toUpperCase();
    const adminKey = `WPIPE-ADM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    await env.DB.prepare(
      `INSERT INTO licenses (
        id, license_key, admin_key, customer_email, customer_name, plan, status, max_machines, max_seats, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(licenseId, finalKey, adminKey, customer_email || "vip@wisrovi.dev", customer_name || "VIP Partner", plan, max_seats, max_seats, expires_at).run();

    return new Response(
      JSON.stringify({
        status: "success",
        license_id: licenseId,
        license_key: finalKey,
        admin_key: adminKey,
        max_seats,
        plan,
        expires_at,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. GET /v1/admin/stats (High-level dashboard aggregates)
  if (path === "/v1/admin/stats" && request.method === "GET") {
    const licStats = await env.DB.prepare(
      "SELECT count(*) as total, sum(case when status='active' then 1 else 0 end) as active FROM licenses"
    ).first<any>();

    const leaseStats = await env.DB.prepare(
      "SELECT count(*) as active_leases FROM leases WHERE lease_expires_at > datetime('now')"
    ).first<any>();

    const auditStats = await env.DB.prepare(
      "SELECT count(*) as total_events FROM audit_logs WHERE created_at > datetime('now', '-7 days')"
    ).first<any>();

    return new Response(
      JSON.stringify({
        total_licenses: licStats?.total || 0,
        active_licenses: licStats?.active || 0,
        active_floating_leases: leaseStats?.active_leases || 0,
        recent_audit_events_7d: auditStats?.total_events || 0,
        server_timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. GET /v1/admin/system/ping (Edge telemetry & D1 round-trip benchmark)
  if (path === "/v1/admin/system/ping" && request.method === "GET") {
    const start = Date.now();
    await env.DB.prepare("SELECT 1;").first();
    const duration = Date.now() - start;
    const cf = (request as any).cf;
    return new Response(
      JSON.stringify({
        status: "healthy",
        latency_ms: duration,
        edge_colo: cf?.colo || "EDGE",
        country: cf?.country || "ES",
        server_timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. POST /v1/admin/licenses/update (Direct state & quota editor)
  if (path === "/v1/admin/licenses/update" && request.method === "POST") {
    const body: any = await request.json().catch(() => ({}));
    const { license_id, status, max_seats, plan, expires_at } = body;
    if (!license_id) {
      return new Response(JSON.stringify({ error: "MISSING_LICENSE_ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await env.DB.prepare(
      `UPDATE licenses SET 
        status = coalesce(?, status),
        max_seats = coalesce(?, max_seats),
        max_machines = coalesce(?, max_machines),
        plan = coalesce(?, plan),
        expires_at = ?,
        updated_at = datetime('now')
      WHERE id = ?`
    ).bind(status ?? null, max_seats ?? null, max_seats ?? null, plan ?? null, expires_at ?? null, license_id).run();

    return new Response(JSON.stringify({ status: "success", updated_id: license_id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 6. POST /v1/admin/leases/kick (Kick specific lease by ID)
  if (path === "/v1/admin/leases/kick" && request.method === "POST") {
    const body: any = await request.json().catch(() => ({}));
    const { lease_id } = body;
    if (!lease_id) {
      return new Response(JSON.stringify({ error: "MISSING_LEASE_ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await env.DB.prepare("DELETE FROM leases WHERE id = ?").bind(lease_id).run();
    return new Response(JSON.stringify({ status: "success", kicked_id: lease_id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 7. POST /v1/admin/leases/purge (Purge all expired leases)
  if (path === "/v1/admin/leases/purge" && request.method === "POST") {
    const result = await env.DB.prepare("DELETE FROM leases WHERE lease_expires_at <= datetime('now')").run();
    return new Response(
      JSON.stringify({ status: "success", purged_count: result.meta?.changes || 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ error: "NOT_FOUND", path }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
