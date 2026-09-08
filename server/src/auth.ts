import type { Request, Response, NextFunction } from "express";
import { supabaseAuth } from "./supabaseAdmin.js";
import { queryOne } from "./db.js";

export interface AuthProfile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  is_child: boolean;
  is_active: boolean;
  approval_status: "pending" | "approved" | "rejected";
  avatar_color: string;
}

const PROFILE_COLS = "id,email,name,role,is_child,is_active,approval_status,avatar_color";

// Bearer token'ı Supabase Auth ile doğrular ve ilgili profili req.user'a ekler.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Giriş gerekli" });
  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: "Oturum geçersiz veya süresi dolmuş" });
    const profile = await queryOne<AuthProfile>(`SELECT ${PROFILE_COLS} FROM profiles WHERE id=$1`, [data.user.id]);
    if (!profile) return res.status(401).json({ error: "Profil bulunamadı" });
    if (!profile.is_active) return res.status(403).json({ error: "Hesap pasifleştirilmiş", code: "INACTIVE" });
    (req as any).user = profile;
    next();
  } catch {
    return res.status(401).json({ error: "Oturum doğrulanamadı" });
  }
}

// Onay bekleyen (pending) veya reddedilmiş kullanıcıların uygulamanın geri kalanına erişmesini engeller.
// /api/auth/me bunu kullanmaz — böylece istemci "onay bekliyor" ekranını gösterebilir.
export function requireApproved(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthProfile;
  if (user.approval_status === "pending")
    return res.status(403).json({ error: "Hesabınız yönetici onayı bekliyor", code: "PENDING_APPROVAL" });
  if (user.approval_status === "rejected")
    return res.status(403).json({ error: "Kayıt talebiniz reddedildi", code: "REJECTED" });
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthProfile;
  if (user.role !== "admin") return res.status(403).json({ error: "Bu işlem için yönetici yetkisi gerekli" });
  next();
}

export function currentUser(req: Request): AuthProfile {
  return (req as any).user as AuthProfile;
}
