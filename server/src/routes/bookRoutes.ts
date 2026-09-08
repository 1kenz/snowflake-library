import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import { query, queryOne, withTransaction } from "../db.js";
import { requireAuth, currentUser } from "../auth.js";
import { supabaseAdmin, COVERS_BUCKET } from "../supabaseAdmin.js";

export const bookRoutes = Router();
bookRoutes.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const BOOK_FIELDS = [
  "title", "author", "publisher", "publish_year", "isbn", "page_count", "language",
  "description", "genre", "audience", "series_name", "series_index", "status",
  "rating", "current_page", "started_at", "finished_at", "is_wishlist", "is_private",
] as const;
const BOOL_FIELDS = new Set(["is_wishlist", "is_private"]);

function normalize(field: string, value: unknown) {
  if (BOOL_FIELDS.has(field)) return !!value && value !== "0";
  return value === "" ? null : value;
}

async function attachExtras(books: any[]) {
  if (!books.length) return books;
  const ids = books.map((b) => b.id);
  const tags = await query(
    `SELECT bt.book_id, t.id, t.name, t.color FROM book_tags bt JOIN tags t ON t.id=bt.tag_id WHERE bt.book_id = ANY($1)`,
    [ids]
  );
  const loans = await query(
    `SELECT l.*, u.name AS lent_to_member FROM loans l LEFT JOIN profiles u ON u.id=l.lent_to_user_id
     WHERE l.returned_at IS NULL AND l.book_id = ANY($1)`,
    [ids]
  );
  for (const b of books) {
    b.tags = tags.filter((t: any) => t.book_id === b.id).map((t: any) => ({ id: t.id, name: t.name, color: t.color }));
    const loan = loans.find((l: any) => l.book_id === b.id);
    b.active_loan = loan ? { id: loan.id, to: loan.lent_to_member || loan.lent_to_name, lent_at: loan.lent_at } : null;
  }
  return books;
}

// Liste: ?scope=mine|family&status=&q=&tag=&wishlist=0|1&sort=
bookRoutes.get("/", async (req, res) => {
  const me = currentUser(req);
  const { scope = "mine", status, q, tag, wishlist, sort = "created" } = req.query as Record<string, string>;
  const where: string[] = [];
  const params: any[] = [];
  let i = 0;
  const ph = () => `$${++i}`;

  if (scope === "family") {
    where.push(`(b.is_private=false OR b.user_id=${ph()})`);
    params.push(me.id);
  } else {
    where.push(`b.user_id=${ph()}`);
    params.push(me.id);
  }
  where.push(`b.is_wishlist=${ph()}`);
  params.push(wishlist === "1");
  if (status) { where.push(`b.status=${ph()}`); params.push(status); }
  if (q) {
    const like = `%${q}%`;
    where.push(`(b.title ILIKE ${ph()} OR b.author ILIKE ${ph()} OR b.isbn ILIKE ${ph()} OR EXISTS(
      SELECT 1 FROM notes n WHERE n.book_id=b.id AND n.content ILIKE ${ph()}))`);
    params.push(like, like, like, like);
  }
  if (tag) {
    where.push(`EXISTS(SELECT 1 FROM book_tags bt JOIN tags t ON t.id=bt.tag_id WHERE bt.book_id=b.id AND t.name=${ph()})`);
    params.push(tag);
  }
  const sorts: Record<string, string> = {
    created: "b.created_at DESC",
    title: "LOWER(b.title) ASC",
    author: "LOWER(b.author) ASC",
    rating: "b.rating DESC",
    year: "b.publish_year DESC NULLS LAST",
  };
  const books = await query(
    `SELECT b.*, u.name AS owner_name, u.avatar_color AS owner_color FROM books b
     JOIN profiles u ON u.id=b.user_id WHERE ${where.join(" AND ")} ORDER BY ${sorts[sort] || sorts.created}`,
    params
  );
  res.json(await attachExtras(books));
});

bookRoutes.get("/:id", async (req, res) => {
  const me = currentUser(req);
  const book = await queryOne(
    "SELECT b.*, u.name AS owner_name, u.avatar_color AS owner_color FROM books b JOIN profiles u ON u.id=b.user_id WHERE b.id=$1",
    [Number(req.params.id)]
  );
  if (!book) return res.status(404).json({ error: "Kitap bulunamadı" });
  if ((book as any).is_private && (book as any).user_id !== me.id) return res.status(403).json({ error: "Bu kitap özel" });
  res.json((await attachExtras([book]))[0]);
});

async function applyTags(bookId: number, tagNames: string[]) {
  await query("DELETE FROM book_tags WHERE book_id=$1", [bookId]);
  const colors = ["#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#60a5fa"];
  for (const raw of tagNames) {
    const name = String(raw).trim();
    if (!name) continue;
    let tag = await queryOne<{ id: number }>("SELECT id FROM tags WHERE name=$1", [name]);
    if (!tag) {
      const countRow = await queryOne<{ c: string }>("SELECT COUNT(*) c FROM tags");
      const count = Number(countRow?.c || 0);
      const rows = await query<{ id: number }>("INSERT INTO tags(name,color) VALUES($1,$2) RETURNING id", [name, colors[count % colors.length]]);
      tag = rows[0];
    }
    await query("INSERT INTO book_tags(book_id,tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [bookId, tag!.id]);
  }
}

bookRoutes.post("/", async (req, res) => {
  const me = currentUser(req);
  const body = req.body || {};
  if (!body.title) return res.status(400).json({ error: "Başlık gerekli" });
  const cols = ["user_id"], vals: any[] = [me.id], phs = ["$1"];
  let i = 1;
  for (const f of BOOK_FIELDS) {
    if (body[f] !== undefined) { cols.push(f); vals.push(normalize(f, body[f])); phs.push(`$${++i}`); }
  }
  const rows = await query<{ id: number }>(
    `INSERT INTO books(${cols.join(",")}) VALUES(${phs.join(",")}) RETURNING id`,
    vals
  );
  const id = rows[0].id;
  if (Array.isArray(body.tags)) await applyTags(id, body.tags);
  if (body.cover_path) await query("UPDATE books SET cover_path=$1 WHERE id=$2", [String(body.cover_path), id]);
  if (body.ai_summary) {
    await query("INSERT INTO notes(book_id,user_id,type,title,content) VALUES($1,$2,'summary','Özet',$3)", [id, me.id, String(body.ai_summary)]);
  }
  res.json({ id });
});

bookRoutes.put("/:id", async (req, res) => {
  const me = currentUser(req);
  const id = Number(req.params.id);
  const book = await queryOne<{ user_id: string }>("SELECT user_id FROM books WHERE id=$1", [id]);
  if (!book) return res.status(404).json({ error: "Kitap bulunamadı" });
  if (book.user_id !== me.id && me.role !== "admin") return res.status(403).json({ error: "Sadece kitabın sahibi düzenleyebilir" });
  const body = req.body || {};
  const sets: string[] = [], vals: any[] = [];
  let i = 0;
  for (const f of BOOK_FIELDS) {
    if (body[f] !== undefined) { sets.push(`${f}=$${++i}`); vals.push(normalize(f, body[f])); }
  }
  if (body.cover_path !== undefined) { sets.push(`cover_path=$${++i}`); vals.push(String(body.cover_path)); }
  if (sets.length) {
    sets.push("updated_at=now()");
    vals.push(id);
    await query(`UPDATE books SET ${sets.join(",")} WHERE id=$${++i}`, vals);
  }
  if (Array.isArray(body.tags)) await applyTags(id, body.tags);
  res.json({ ok: true });
});

function coverObjectPath(coverPath: string): string | null {
  const marker = `/storage/v1/object/public/${COVERS_BUCKET}/`;
  const idx = coverPath.indexOf(marker);
  if (idx === -1) return null;
  return coverPath.slice(idx + marker.length);
}

bookRoutes.delete("/:id", async (req, res) => {
  const me = currentUser(req);
  const id = Number(req.params.id);
  const book = await queryOne<{ user_id: string; cover_path: string }>("SELECT user_id, cover_path FROM books WHERE id=$1", [id]);
  if (!book) return res.status(404).json({ error: "Kitap bulunamadı" });
  if (book.user_id !== me.id && me.role !== "admin") return res.status(403).json({ error: "Sadece kitabın sahibi silebilir" });
  await query("DELETE FROM books WHERE id=$1", [id]);
  const objectPath = book.cover_path && coverObjectPath(book.cover_path);
  if (objectPath) await supabaseAdmin.storage.from(COVERS_BUCKET).remove([objectPath]).catch(() => {});
  res.json({ ok: true });
});

// Kapak yükleme (dosya) — Supabase Storage'a yazar
bookRoutes.post("/cover/upload", upload.single("cover"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Dosya gerekli" });
  const ext = (req.file.originalname?.split(".").pop() || "jpg").toLowerCase();
  const name = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(COVERS_BUCKET).upload(name, req.file.buffer, {
    contentType: req.file.mimetype || "image/jpeg",
    upsert: false,
  });
  if (error) return res.status(500).json({ error: "Kapak yüklenemedi: " + error.message });
  const { data } = supabaseAdmin.storage.from(COVERS_BUCKET).getPublicUrl(name);
  res.json({ cover_path: data.publicUrl });
});

// Kapak indirme (URL'den — CORS'suz, sunucu taraflı) — Supabase Storage'a yazar
bookRoutes.post("/cover/from-url", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || !/^https?:\/\//.test(url)) return res.status(400).json({ error: "Geçerli URL gerekli" });
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) throw new Error("İndirilemedi");
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 200) throw new Error("Kapak bulunamadı");
    const ct = r.headers.get("content-type") || "";
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const name = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
    const { error } = await supabaseAdmin.storage.from(COVERS_BUCKET).upload(name, buf, {
      contentType: ct || "image/jpeg",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data } = supabaseAdmin.storage.from(COVERS_BUCKET).getPublicUrl(name);
    res.json({ cover_path: data.publicUrl });
  } catch (e: any) {
    res.status(400).json({ error: "Kapak indirilemedi: " + e.message });
  }
});
