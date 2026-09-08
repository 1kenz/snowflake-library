import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, currentUser } from "../auth.js";

export const authRoutes = Router();

// Giriş, Google OAuth ile istemci tarafında (Supabase Auth) yapılır.
// Bu uç yalnızca oturum açmış kullanıcının profilini döner — onay bekleyenler dahil,
// böylece istemci "yönetici onayı bekleniyor" ekranını gösterebilir.
authRoutes.get("/me", requireAuth, (req, res) => {
  res.json(currentUser(req));
});

authRoutes.put("/me", requireAuth, async (req, res) => {
  const me = currentUser(req);
  const { name, avatar_color } = req.body || {};
  if (name !== undefined && String(name).trim()) await query("UPDATE profiles SET name=$1 WHERE id=$2", [String(name).trim(), me.id]);
  if (avatar_color !== undefined && String(avatar_color).trim()) await query("UPDATE profiles SET avatar_color=$1 WHERE id=$2", [String(avatar_color), me.id]);
  res.json({ ok: true });
});
