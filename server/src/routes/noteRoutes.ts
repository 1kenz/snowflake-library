import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth, currentUser } from "../auth.js";

export const noteRoutes = Router();
noteRoutes.use(requireAuth);

// Bir kitabın notları
noteRoutes.get("/book/:bookId", async (req, res) => {
  const me = currentUser(req);
  const notes = await query(
    `SELECT n.*, u.name AS author_name FROM notes n JOIN profiles u ON u.id=n.user_id
     WHERE n.book_id=$1 AND (n.is_private=false OR n.user_id=$2) ORDER BY n.created_at DESC`,
    [Number(req.params.bookId), me.id]
  );
  res.json(notes);
});

// Tüm alıntılar / not araması: ?type=quote&q=
noteRoutes.get("/", async (req, res) => {
  const me = currentUser(req);
  const { type, q } = req.query as Record<string, string>;
  const where = ["(n.is_private=false OR n.user_id=$1)", "(b.is_private=false OR b.user_id=$2)"];
  const params: any[] = [me.id, me.id];
  let i = 2;
  if (type) { where.push(`n.type=$${++i}`); params.push(type); }
  if (q) { where.push(`(n.content ILIKE $${++i} OR n.title ILIKE $${i})`); params.push(`%${q}%`); }
  const notes = await query(
    `SELECT n.*, u.name AS author_name, b.title AS book_title, b.author AS book_author
     FROM notes n JOIN profiles u ON u.id=n.user_id JOIN books b ON b.id=n.book_id
     WHERE ${where.join(" AND ")} ORDER BY n.created_at DESC LIMIT 300`,
    params
  );
  res.json(notes);
});

noteRoutes.post("/", async (req, res) => {
  const me = currentUser(req);
  const { book_id, type = "note", title = "", content, page_no = null, is_private = false } = req.body || {};
  if (!book_id || !content) return res.status(400).json({ error: "Kitap ve içerik gerekli" });
  const rows = await query<{ id: number }>(
    "INSERT INTO notes(book_id,user_id,type,title,content,page_no,is_private) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
    [Number(book_id), me.id, type, title, content, page_no, !!is_private]
  );
  res.json({ id: rows[0].id });
});

noteRoutes.put("/:id", async (req, res) => {
  const me = currentUser(req);
  const note = await queryOne<{ user_id: string }>("SELECT user_id FROM notes WHERE id=$1", [Number(req.params.id)]);
  if (!note) return res.status(404).json({ error: "Not bulunamadı" });
  if (note.user_id !== me.id) return res.status(403).json({ error: "Sadece notun sahibi düzenleyebilir" });
  const { title, content, page_no, is_private, type } = req.body || {};
  await query(
    `UPDATE notes SET title=COALESCE($1,title), content=COALESCE($2,content), page_no=COALESCE($3,page_no),
     is_private=COALESCE($4,is_private), type=COALESCE($5,type) WHERE id=$6`,
    [title ?? null, content ?? null, page_no ?? null, is_private === undefined ? null : !!is_private, type ?? null, Number(req.params.id)]
  );
  res.json({ ok: true });
});

noteRoutes.delete("/:id", async (req, res) => {
  const me = currentUser(req);
  const note = await queryOne<{ user_id: string }>("SELECT user_id FROM notes WHERE id=$1", [Number(req.params.id)]);
  if (!note) return res.status(404).json({ error: "Not bulunamadı" });
  if (note.user_id !== me.id && me.role !== "admin") return res.status(403).json({ error: "Yetki yok" });
  await query("DELETE FROM notes WHERE id=$1", [Number(req.params.id)]);
  res.json({ ok: true });
});
