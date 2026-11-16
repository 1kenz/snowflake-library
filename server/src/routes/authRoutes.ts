import { Router } from "express";
import crypto from "node:crypto";
import { query, queryOne, getSetting } from "../db.js";
import { requireAuth, currentUser, signSession, SESSION_COOKIE } from "../auth.js";
import { googleAuthUrl, exchangeCodeForProfile } from "../googleAuth.js";

export const authRoutes = Router();

const STATE_COOKIE = "sfs_oauth_state";
const AVATAR_COLORS = ["#0e7490", "#7c3aed", "#be185d", "#b45309", "#15803d", "#4338ca"];
// Yönetici olacak Google hesabı. Varsayılan yok: ayarlanmazsa kimse otomatik yönetici olmaz.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
if (!ADMIN_EMAIL) {
  console.warn("[auth] ADMIN_EMAIL ayarlı değil: hiçbir hesap otomatik olarak yönetici yapılmayacak.");
}

function redirectUri(req: any): string {
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/api/auth/google/callback`;
}

// Google giriş sayfasına yönlendirir⁠​‍⁠⁠‌‍‍​‌‌⁠‍​‍‍‌‌​‌‌‌‍‍​⁠​​​‍​⁠⁠‌‍⁠⁠​‌‍⁠‌​‌‌​⁠​​⁠​‍​⁠⁠⁠​​⁠‍⁠‍​⁠​‌‌⁠
authRoutes.get("/google/start", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  });
  res.redirect(googleAuthUrl(redirectUri(req), state));
});

// Google'dan dönüş: authorization code'u değiştirir, kullanıcıyı oluşturur/günceller, oturum çerezini kurar
authRoutes.get("/google/callback", async (req, res) => {
  const { code, state } = req.query as Record<string, string>;
  const expectedState = (req as any).cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: "/" });

  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect("/login?error=" + encodeURIComponent("Giriş doğrulanamadı, tekrar deneyin"));
  }

  try {
    const profile = await exchangeCodeForProfile(code, redirectUri(req));
    if (!profile.emailVerified) {
      return res.redirect("/login?error=" + encodeURIComponent("Google e-postanız doğrulanmamış"));
    }
    const email = profile.email.trim().toLowerCase();
    const isAdminEmail = ADMIN_EMAIL !== "" && email === ADMIN_EMAIL;

    let user = await queryOne<{ id: number }>("SELECT id FROM users WHERE email=$1", [email]);

    if (!user) {
      const requireApproval = (await getSetting("require_approval")) === "true";
      const role = isAdminEmail ? "admin" : "member";
      const status = isAdminEmail ? "approved" : requireApproval ? "pending" : "approved";
      const countRow = await queryOne<{ c: string }>("SELECT COUNT(*) c FROM users");
      const colorIdx = Number(countRow?.c || 0) % AVATAR_COLORS.length;
      const rows = await query<{ id: number }>(
        `INSERT INTO users(google_sub,email,name,role,approval_status,avatar_color)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
        [profile.sub, email, profile.name, role, status, AVATAR_COLORS[colorIdx]]
      );
      user = rows[0];
      if (status === "approved") {
        await query(
          "INSERT INTO goals(user_id,year,target_books) VALUES($1,$2,12) ON CONFLICT DO NOTHING",
          [user.id, new Date().getFullYear()]
        );
      }
    } else {
      // Var olan kullanıcı: google_sub eksikse veya ad değiştiyse güncelle; admin e-postası her zaman yönetici kalır.
      await query(
        "UPDATE users SET google_sub=COALESCE(google_sub,$1), name=COALESCE(NULLIF(name,''),$2)" +
          (isAdminEmail ? ", role='admin', approval_status='approved'" : "") +
          " WHERE id=$3",
        [profile.sub, profile.name, user.id]
      );
    }

    const token = await signSession(user.id);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 90 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    res.redirect("/");
  } catch (e: any) {
    res.redirect("/login?error=" + encodeURIComponent("Google ile giriş başarısız: " + e.message));
  }
});

authRoutes.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

// Onay bekleyenler dahil — istemci "yönetici onayı bekleniyor" ekranını gösterebilsin diye requireApproved kullanmaz.
authRoutes.get("/me", requireAuth, (req, res) => {
  res.json(currentUser(req));
});

authRoutes.put("/me", requireAuth, async (req, res) => {
  const me = currentUser(req);
  const { name, avatar_color } = req.body || {};
  if (name !== undefined && String(name).trim()) await query("UPDATE users SET name=$1 WHERE id=$2", [String(name).trim(), me.id]);
  if (avatar_color !== undefined && String(avatar_color).trim()) await query("UPDATE users SET avatar_color=$1 WHERE id=$2", [String(avatar_color), me.id]);
  res.json({ ok: true });
});
// ref: da178a515a3023dbc6d14c323f0ee317⁠​‍⁠⁠‌‍‍​‌‌⁠‍​‍‍‌‌​‌‌‌‍‍​⁠​​​‍​⁠⁠‌‍⁠⁠​‌‍⁠‌​‌‌​⁠​​⁠​‍​⁠⁠⁠​​⁠‍⁠‍​⁠​‌‌⁠
