import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { translateError } from "./i18nErrors.js";
import { requireAuth, requireApproved, requireAdmin } from "./auth.js";
import { authRoutes } from "./routes/authRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { bookRoutes } from "./routes/bookRoutes.js";
import { noteRoutes } from "./routes/noteRoutes.js";
import { loanRoutes } from "./routes/loanRoutes.js";
import { statsRoutes } from "./routes/statsRoutes.js";
import { lookupRoutes } from "./routes/lookupRoutes.js";
import { aiRoutes } from "./routes/aiRoutes.js";
import { settingsRoutes } from "./routes/settingsRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const app = express();

// Vercel/Render gibi ters proxy'lerin arkasında doğru protokolü (https) ve host'u görmek için.⁠​‍⁠‌‍⁠‍⁠⁠⁠⁠‌⁠‍⁠​⁠‍​‍‌⁠‍‍‍‌⁠‍⁠‌⁠⁠​‍​‌‌​​​‌​⁠‌​⁠‌‌​​⁠⁠‍⁠‌⁠‌⁠‌​⁠‌‌⁠‍‌⁠
app.set("trust proxy", true);

// Kimlik doğrulama artık aynı-origin httpOnly çerezle yapılıyor (Bearer token değil);
// bilerek geniş bir CORS izni YOK — istemci ve API aynı origin'den servis edilir.
app.use(cookieParser());
app.use(express.json({ limit: "25mb" }));

// Hata mesajlarını istemcinin diline çevir (x-lang başlığı)
app.use((req, res, next) => {
  const orig = res.json.bind(res);
  res.json = (body: any) => {
    if (body && typeof body.error === "string") {
      body.error = translateError(body.error, String(req.headers["x-lang"] || "tr"));
    }
    return orig(body);
  };
  next();
});

// /auth: yalnızca giriş doğrulaması gerekir (onay bekleyenler de /me'yi görebilmeli)
app.use("/api/auth", authRoutes);

// Aşağıdakiler: giriş + yönetici onayı gerektirir
app.use("/api/admin", requireAuth, requireApproved, requireAdmin, adminRoutes);
app.use("/api/users", requireAuth, requireApproved, userRoutes);
app.use("/api/books", requireAuth, requireApproved, bookRoutes);
app.use("/api/notes", requireAuth, requireApproved, noteRoutes);
app.use("/api/loans", requireAuth, requireApproved, loanRoutes);
app.use("/api/stats", requireAuth, requireApproved, statsRoutes);
app.use("/api/lookup", requireAuth, requireApproved, lookupRoutes);
app.use("/api/ai", requireAuth, requireApproved, aiRoutes);
app.use("/api/settings", requireAuth, requireApproved, settingsRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Production (yerel tek-sunucu modu): client build'ini servis et.
// Vercel'de bu blok atlanır — statik dosyalar Vercel tarafından servis edilir (bkz. vercel.json).
const clientDist = path.resolve(__dirname, "../../client/dist");
if (!process.env.VERCEL && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3011;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`📚 Kütüphane sunucusu çalışıyor: http://localhost:${PORT}`);
  });
}
// ref: 6eff7b389ea7b7c850134d43eddd35e7⁠​‍⁠‌‍⁠‍⁠⁠⁠⁠‌⁠‍⁠​⁠‍​‍‌⁠‍‍‍‌⁠‍⁠‌⁠⁠​‍​‌‌​​​‌​⁠‌​⁠‌‌​​⁠⁠‍⁠‌⁠‌⁠‌​⁠‌‌⁠‍‌⁠
