import { Router } from "express";
import { query, getSetting, setSetting } from "../db.js";
import { currentUser } from "../auth.js";
import { supabaseAdmin } from "../supabaseAdmin.js";

export const adminRoutes = Router();

// Onay bekleyen kayıtlar
adminRoutes.get("/pending", async (_req, res) => {
  const rows = await query(
    "SELECT id,email,name,avatar_color,created_at FROM profiles WHERE approval_status='pending' ORDER BY created_at"
  );
  res.json(rows);
});

adminRoutes.post("/approve/:id", async (req, res) => {
  const id = req.params.id;
  const rows = await query("UPDATE profiles SET approval_status='approved' WHERE id=$1 RETURNING id", [id]);
  if (!rows.length) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
  const year = new Date().getFullYear();
  await query(
    "INSERT INTO goals(user_id,year,target_books) VALUES($1,$2,12) ON CONFLICT DO NOTHING",
    [id, year]
  );
  res.json({ ok: true });
});

adminRoutes.post("/reject/:id", async (req, res) => {
  const rows = await query(
    "UPDATE profiles SET approval_status='rejected', is_active=false WHERE id=$1 RETURNING id",
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
  res.json({ ok: true });
});

// Yeni kayıtlar için yönetici onayı zorunlu mu? (buton)
adminRoutes.get("/settings", async (_req, res) => {
  const requireApproval = (await getSetting("require_approval")) === "true";
  res.json({ require_approval: requireApproval });
});

adminRoutes.put("/settings", async (req, res) => {
  const { require_approval } = req.body || {};
  if (require_approval !== undefined) await setSetting("require_approval", require_approval ? "true" : "false");
  res.json({ ok: true });
});

// Rol değiştir (admin <-> member) — en az bir admin kalmalı
adminRoutes.put("/role/:id", async (req, res) => {
  const me = currentUser(req);
  const id = req.params.id;
  const { role } = req.body || {};
  if (role !== "admin" && role !== "member") return res.status(400).json({ error: "Geçersiz rol" });
  if (role === "member" && id === me.id) {
    const admins = await query<{ c: string }>("SELECT COUNT(*) c FROM profiles WHERE role='admin'");
    if (Number(admins[0]?.c || 0) <= 1) return res.status(400).json({ error: "Son yönetici hesabı değiştirilemez" });
  }
  await query("UPDATE profiles SET role=$1 WHERE id=$2", [role, id]);
  res.json({ ok: true });
});

// Üyeyi tamamen sil (Auth kullanıcısı dahil — profil kaskad silinir)
adminRoutes.delete("/users/:id", async (req, res) => {
  const me = currentUser(req);
  const id = req.params.id;
  if (id === me.id) return res.status(400).json({ error: "Kendi hesabınızı silemezsiniz" });
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return res.status(400).json({ error: "Kullanıcı silinemedi: " + error.message });
  res.json({ ok: true });
});
