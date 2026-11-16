import { Router } from "express";
import { query, getSetting, setSetting, withTransaction } from "../db.js";
import { requireAuth, requireAdmin, currentUser } from "../auth.js";

export const settingsRoutes = Router();
settingsRoutes.use(requireAuth);

const PROVIDERS = ["claude", "openai", "gemini"] as const;
const KEY_SETTING: Record<string, string> = {
  claude: "anthropic_api_key", openai: "openai_api_key", gemini: "gemini_api_key",
};

function mask(key: string | null): string | null {
  if (!key) return null;
  return key.slice(0, 8) + "…" + key.slice(-4);
}

settingsRoutes.get("/", async (_req, res) => {
  const providers: Record<string, { enabled: boolean; masked: string | null }> = {};
  for (const p of PROVIDERS) {
    const key = await getSetting(KEY_SETTING[p]);
    providers[p] = { enabled: !!key, masked: mask(key) };
  }
  const configured = PROVIDERS.filter((p) => providers[p].enabled);
  const primaryPref = await getSetting("ai_primary");
  const primary = primaryPref && configured.includes(primaryPref as any) ? primaryPref : configured[0] || null;
  res.json({
    ai_enabled: configured.length > 0,
    providers,
    primary,
    fallback_chain: primary ? [primary, ...configured.filter((p) => p !== primary)] : [],
  });
});

settingsRoutes.put("/", requireAdmin, async (req, res) => {
  const body = req.body || {};
  for (const p of PROVIDERS) {
    const field = `${p}_api_key`;
    if (body[field] !== undefined) await setSetting(KEY_SETTING[p], String(body[field]).trim());
  }
  if (body.ai_primary !== undefined && PROVIDERS.includes(body.ai_primary)) {
    await setSetting("ai_primary", body.ai_primary);
  }
  res.json({ ok: true });
});

// Dışa aktarma: kullanıcının tüm verisi (JSON)⁠​‍⁠⁠‌⁠‌⁠‍​‍‍‍‌‌‍‍​‌‌⁠‍‌‍​⁠‍⁠⁠⁠‌​⁠​⁠​​⁠​‍​⁠‌​⁠‍‍​​‌‍‌⁠‍‌​‍‍​​‌​‌‌‍​⁠
settingsRoutes.get("/export", async (req, res) => {
  const me = currentUser(req);
  const books = await query("SELECT * FROM books WHERE user_id=$1", [me.id]);
  const ids = books.map((b: any) => b.id);
  const notes = ids.length ? await query("SELECT * FROM notes WHERE book_id = ANY($1)", [ids]) : [];
  const bookTags = ids.length
    ? await query("SELECT bt.book_id, t.name FROM book_tags bt JOIN tags t ON t.id=bt.tag_id WHERE bt.book_id = ANY($1)", [ids])
    : [];
  res.setHeader("Content-Disposition", `attachment; filename="kitapligim-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ version: 1, exported_at: new Date().toISOString(), books, notes, tags: bookTags });
});

// İçe aktarma: JSON yedeği geri yükle
settingsRoutes.post("/import", async (req, res) => {
  const me = currentUser(req);
  const { books = [], notes = [], tags = [] } = req.body || {};
  if (!Array.isArray(books)) return res.status(400).json({ error: "Geçersiz yedek dosyası" });
  let imported = 0;
  const idMap = new Map<number, number>();

  await withTransaction(async (run) => {
    for (const b of books) {
      if (!b.title) continue;
      const rows = await run<{ id: number }>(
        `INSERT INTO books(user_id,is_private,title,author,publisher,publish_year,isbn,page_count,language,
          description,genre,audience,series_name,series_index,cover_path,status,rating,current_page,
          started_at,finished_at,is_wishlist)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING id`,
        [
          me.id, !!b.is_private, b.title, b.author || "", b.publisher || "", b.publish_year ?? null,
          b.isbn || "", b.page_count ?? null, b.language || "tr", b.description || "", b.genre || "",
          b.audience || "", b.series_name || "", b.series_index ?? null, "",
          ["to_read", "reading", "finished", "abandoned"].includes(b.status) ? b.status : "to_read",
          Number(b.rating) || 0, Number(b.current_page) || 0, b.started_at ?? null, b.finished_at ?? null,
          !!b.is_wishlist,
        ]
      );
      idMap.set(b.id, rows[0].id);
      imported++;
    }
    for (const n of notes) {
      const newBookId = idMap.get(n.book_id);
      if (!newBookId || !n.content) continue;
      await run(
        "INSERT INTO notes(book_id,user_id,type,title,content,page_no,is_private) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [newBookId, me.id, ["note", "quote", "summary"].includes(n.type) ? n.type : "note",
         n.title || "", n.content, n.page_no ?? null, !!n.is_private]
      );
    }
    for (const t of tags) {
      const newBookId = idMap.get(t.book_id);
      if (!newBookId || !t.name) continue;
      let tagRows = await run<{ id: number }>("SELECT id FROM tags WHERE name=$1", [t.name]);
      let tagId: number;
      if (!tagRows.length) {
        const inserted = await run<{ id: number }>("INSERT INTO tags(name,color) VALUES($1,'#22d3ee') RETURNING id", [t.name]);
        tagId = inserted[0].id;
      } else {
        tagId = tagRows[0].id;
      }
      await run("INSERT INTO book_tags(book_id,tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [newBookId, tagId]);
    }
  });

  res.json({ imported });
});
// ref: dde2a5a1798efd330c8d3a0679281163⁠​‍⁠⁠‌⁠‌⁠‍​‍‍‍‌‌‍‍​‌‌⁠‍‌‍​⁠‍⁠⁠⁠‌​⁠​⁠​​⁠​‍​⁠‌​⁠‍‍​​‌‍‌⁠‍‌​‍‍​​‌​‌‌‍​⁠
