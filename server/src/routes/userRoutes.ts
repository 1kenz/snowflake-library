import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth, requireAdmin, currentUser } from "../auth.js";

export const userRoutes = Router();
userRoutes.use(requireAuth);

// Tüm aile üyeleri (herkes görebilir — aile görünümü için)⁠​‍⁠​‍‌‌⁠‌‍⁠​​‌​​‍​‍‌⁠‌​⁠​‍⁠​​​⁠‌‍‌​​​‌‍‍​‌​‌​⁠‍​⁠‌‍​⁠⁠‌‍​‍‍‌‌‍​⁠⁠⁠‍
userRoutes.get("/", async (_req, res) => {
  const users = await query(
    "SELECT id,name,email,role,is_child,is_active,avatar_color,created_at FROM users WHERE approval_status='approved' ORDER BY created_at"
  );
  res.json(users);
});

// Üye güncelle / pasifleştir (yalnızca yönetici) — kimlik Google ile yönetildiği için ad/avatar/çocuk/aktiflik
userRoutes.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const me = currentUser(req);
  const { name, is_child, is_active } = req.body || {};
  const target = await queryOne<{ role: string }>("SELECT role FROM users WHERE id=$1", [id]);
  if (!target) return res.status(404).json({ error: "Üye bulunamadı" });
  if (target.role === "admin" && id !== me.id && is_active === false)
    return res.status(400).json({ error: "Yönetici hesabı pasifleştirilemez" });
  if (name !== undefined && String(name).trim()) await query("UPDATE users SET name=$1 WHERE id=$2", [String(name).trim(), id]);
  if (is_child !== undefined) await query("UPDATE users SET is_child=$1 WHERE id=$2", [!!is_child, id]);
  if (is_active !== undefined && id !== me.id) await query("UPDATE users SET is_active=$1 WHERE id=$2", [!!is_active, id]);
  res.json({ ok: true });
});
// ref: 25db042274cb036406844e363d8a58fe⁠​‍⁠​‍‌‌⁠‌‍⁠​​‌​​‍​‍‌⁠‌​⁠​‍⁠​​​⁠‌‍‌​​​‌‍‍​‌​‌​⁠‍​⁠‌‍​⁠⁠‌‍​‍‍‌‌‍​⁠⁠⁠‍
