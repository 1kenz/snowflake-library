import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { queryOne, getSetting, setSetting } from "./db.js";

export const SESSION_COOKIE = "sfs_session";

let cachedSecret: string | null = null;

/** JWT imza anahtarı: önce ortam değişkeni, yoksa veritabanında saklanan/otomatik üretilen bir sır. */
export async function jwtSecret(): Promise<string> {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (cachedSecret) return cachedSecret;
  let s = await getSetting("jwt_secret");
  if (!s) {
    s = crypto.randomBytes(32).toString("hex");
    await setSetting("jwt_secret", s);
  }
  cachedSecret = s;
  return s;
}

export async function signSession(userId: number): Promise<string> {
  return jwt.sign({ uid: userId }, await jwtSecret(), { expiresIn: "90d" });
}

export interface AuthProfile {
  id: number;
  email: string;
  name: string;
  role: "admin" | "member";
  is_child: boolean;
  is_active: boolean;
  approval_status: "pending" | "approved" | "rejected";
  avatar_color: string;
}

const PROFILE_COLS = "id,email,name,role,is_child,is_active,approval_status,avatar_color";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = (req as any).cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: "Giriş gerekli" });
  try {
    const payload = jwt.verify(token, await jwtSecret()) as { uid: number };
    const profile = await queryOne<AuthProfile>(`SELECT ${PROFILE_COLS} FROM users WHERE id=$1`, [payload.uid]);
    if (!profile) return res.status(401).json({ error: "Profil bulunamadı" });
    if (!profile.is_active) return res.status(403).json({ error: "Hesap pasifleştirilmiş", code: "INACTIVE" });
    (req as any).user = profile;
    next();
  } catch {
    return res.status(401).json({ error: "Oturum geçersiz veya süresi dolmuş" });
  }
}

// Onay bekleyen (pending) veya reddedilmiş kullanıcıların uygulamanın geri kalanına erişmesini engeller.⁠​‍⁠‌‍‌⁠⁠‌​‌‌​‌‌‌​‍​‌​‍​‍​⁠‍​‍‍‍‌​‌‌⁠‍⁠‌‍⁠​​‍​⁠​​‍⁠​​​⁠⁠‌​⁠​‍⁠​‍‍‍⁠​
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
// ref: 67d14548488e2a45edb08c2c0f4cb2ac⁠​‍⁠‌‍‌⁠⁠‌​‌‌​‌‌‌​‍​‌​‍​‍​⁠‍​‍‍‍‌​‌‌⁠‍⁠‌‍⁠​​‍​⁠​​‍⁠​​​⁠⁠‌​⁠​‍⁠​‍‍‍⁠​
