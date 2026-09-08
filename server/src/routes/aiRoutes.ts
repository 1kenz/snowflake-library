import { Router } from "express";
import { requireAuth } from "../auth.js";
import { getSetting } from "../db.js";

export const aiRoutes = Router();
aiRoutes.use(requireAuth);

/* ---------- Sağlayıcılar ---------- */
export type Provider = "claude" | "openai" | "gemini";
export const PROVIDER_LABELS: Record<Provider, string> = {
  claude: "Claude", openai: "OpenAI", gemini: "Gemini",
};
export const KEY_SETTING: Record<Provider, string> = {
  claude: "anthropic_api_key", openai: "openai_api_key", gemini: "gemini_api_key",
};
const DEFAULT_MODELS: Record<Provider, string> = {
  claude: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
};

export async function providerModel(p: Provider): Promise<string> {
  return (await getSetting(`ai_model_${p}`)) || DEFAULT_MODELS[p];
}

export async function configuredProviders(): Promise<Provider[]> {
  const out: Provider[] = [];
  for (const p of Object.keys(KEY_SETTING) as Provider[]) {
    if (await getSetting(KEY_SETTING[p])) out.push(p);
  }
  return out;
}

/** Birincil sağlayıcı önde, kalanlar yedek sırada */
export async function providerOrder(): Promise<Provider[]> {
  const configured = await configuredProviders();
  const primary = (await getSetting("ai_primary")) as Provider | null;
  if (primary && configured.includes(primary)) {
    return [primary, ...configured.filter((p) => p !== primary)];
  }
  return configured;
}

async function callClaude(prompt: string): Promise<string> {
  const key = await getSetting(KEY_SETTING.claude);
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: await providerModel("claude"),
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({} as any));
    throw new Error(err?.error?.message || `Claude API hatası (${r.status})`);
  }
  const data = await r.json();
  return data.content?.[0]?.text || "";
}

async function callOpenAI(prompt: string): Promise<string> {
  const key = await getSetting(KEY_SETTING.openai);
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: await providerModel("openai"),
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({} as any));
    throw new Error(err?.error?.message || `OpenAI API hatası (${r.status})`);
  }
  const data = await r.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(prompt: string): Promise<string> {
  const model = await providerModel("gemini");
  const key = await getSetting(KEY_SETTING.gemini);
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1200 },
      }),
    }
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({} as any));
    throw new Error(err?.error?.message || `Gemini API hatası (${r.status})`);
  }
  const data = await r.json();
  return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
}

const CALLERS: Record<Provider, (prompt: string) => Promise<string>> = {
  claude: callClaude, openai: callOpenAI, gemini: callGemini,
};

/* ---------- Görüntülü (vision) çağrılar ---------- */
async function callClaudeVision(prompt: string, mime: string, b64: string): Promise<string> {
  const key = await getSetting(KEY_SETTING.claude);
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: await providerModel("claude"),
      max_tokens: 300,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
          { type: "text", text: prompt },
        ],
      }],
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({} as any));
    throw new Error(err?.error?.message || `Claude API hatası (${r.status})`);
  }
  const data = await r.json();
  return data.content?.[0]?.text || "";
}

async function callOpenAIVision(prompt: string, mime: string, b64: string): Promise<string> {
  const key = await getSetting(KEY_SETTING.openai);
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: await providerModel("openai"),
      max_tokens: 300,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
        ],
      }],
    }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({} as any));
    throw new Error(err?.error?.message || `OpenAI API hatası (${r.status})`);
  }
  const data = await r.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGeminiVision(prompt: string, mime: string, b64: string): Promise<string> {
  const model = await providerModel("gemini");
  const key = await getSetting(KEY_SETTING.gemini);
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: prompt }] }],
        generationConfig: { maxOutputTokens: 300 },
      }),
    }
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({} as any));
    throw new Error(err?.error?.message || `Gemini API hatası (${r.status})`);
  }
  const data = await r.json();
  return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
}

const VISION_CALLERS: Record<Provider, (prompt: string, mime: string, b64: string) => Promise<string>> = {
  claude: callClaudeVision, openai: callOpenAIVision, gemini: callGeminiVision,
};

/* ---------- AI künye ---------- */
aiRoutes.post("/enrich", async (req, res) => {
  const order = await providerOrder();
  if (order.length === 0) {
    return res.status(400).json({
      error: "AI özelliği için Ayarlar'dan en az bir API anahtarı (Claude, OpenAI veya Gemini) girilmeli",
      code: "NO_KEY",
    });
  }

  const { title, author, description } = req.body || {};
  if (!title) return res.status(400).json({ error: "Kitap başlığı gerekli" });

  const lang = String(req.headers["x-lang"] || "tr");
  const LANG_NAMES: Record<string, string> = { tr: "Türkçe", en: "English", de: "Deutsch" };
  const outLang = LANG_NAMES[lang] || "Türkçe";

  const prompt = `Provide information about the book "${title}"${author ? ` (author: ${author})` : ""}.${
    description ? `\nExisting description: ${String(description).slice(0, 800)}` : ""
  }

Write ALL text values in ${outLang}. Respond ONLY with this JSON format, nothing else:
{
  "genre": ["genre1", "genre2"],
  "summary": "A spoiler-free, 2-3 paragraph summary of the book (in ${outLang})",
  "audience": "Who it's for: target audience, age range, reading level (1-2 sentences, in ${outLang})",
  "themes": ["theme1", "theme2", "theme3"],
  "similar": ["Similar Book 1 - Author", "Similar Book 2 - Author", "Similar Book 3 - Author"]
}

If you don't know the book or are unsure, return {"unknown": true}.`;

  const errors: string[] = [];
  for (const provider of order) {
    try {
      const text = await CALLERS[provider](prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("yanıt çözümlenemedi");
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.unknown) {
        errors.push(`${PROVIDER_LABELS[provider]}: kitabı tanıyamadı`);
        continue;
      }
      return res.json({ ...parsed, _provider: PROVIDER_LABELS[provider] });
    } catch (e: any) {
      errors.push(`${PROVIDER_LABELS[provider]}: ${e.message}`);
    }
  }
  res.status(502).json({ error: "AI künye üretilemedi — " + errors.join(" | ") });
});

/* ---------- Kapak fotoğrafından kitap tanıma (vision, yedekli) ---------- */
aiRoutes.post("/identify-cover", async (req, res) => {
  const order = await providerOrder();
  if (order.length === 0) {
    return res.status(400).json({ error: "Bu özellik için Ayarlar'dan bir AI anahtarı girilmeli", code: "NO_KEY" });
  }
  const { image } = req.body || {};
  if (!image || typeof image !== "string") return res.status(400).json({ error: "Görüntü gerekli" });

  const m = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return res.status(400).json({ error: "Geçersiz görüntü formatı (jpeg/png/webp data URL bekleniyor)" });
  const [, mime, b64] = m;
  if (b64.length > 8_000_000) return res.status(400).json({ error: "Görüntü çok büyük" });

  const prompt = `This is a photo of a book cover. Identify the book's title and author exactly as printed on the cover.
Respond ONLY with this JSON format, nothing else:
{"title": "Book Title", "author": "Author Name"}
If the author is not visible, leave the author field empty. If it's not a book cover or unreadable, return {"unknown": true}.`;

  const errors: string[] = [];
  for (const provider of order) {
    try {
      const text = await VISION_CALLERS[provider](prompt, mime, b64);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("yanıt çözümlenemedi");
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.unknown || !parsed.title) {
        errors.push(`${PROVIDER_LABELS[provider]}: kapağı tanıyamadı`);
        continue;
      }
      return res.json({ title: parsed.title, author: parsed.author || "", _provider: PROVIDER_LABELS[provider] });
    } catch (e: any) {
      errors.push(`${PROVIDER_LABELS[provider]}: ${e.message}`);
    }
  }
  res.status(502).json({ error: "Kapak tanınamadı — " + errors.join(" | "), code: "VISION_FAILED" });
});
