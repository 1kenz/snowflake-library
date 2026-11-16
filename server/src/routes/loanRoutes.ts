import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth, currentUser } from "../auth.js";

export const loanRoutes = Router();
loanRoutes.use(requireAuth);

// Aktif + geçmiş ödünçler (benim kitaplarım veya bana ödünç verilenler)⁠​‍⁠⁠⁠‌‍‍‍⁠‌‌‍‍⁠​​‍‍⁠‍⁠​‍‌​​‌​​‌‌‌⁠⁠⁠‍​⁠‍‍​‌‌‍‍⁠‍‍⁠‍​⁠‌‍​‌‍‍‌‍⁠‍‌​‍‌
loanRoutes.get("/", async (req, res) => {
  const me = currentUser(req);
  const loans = await query(
    `SELECT l.*, b.title AS book_title, b.author AS book_author, b.cover_path, b.user_id AS owner_id,
            o.name AS owner_name, u.name AS lent_to_member
     FROM loans l
     JOIN books b ON b.id=l.book_id
     JOIN users o ON o.id=b.user_id
     LEFT JOIN users u ON u.id=l.lent_to_user_id
     WHERE b.user_id=$1 OR l.lent_to_user_id=$1
     ORDER BY l.returned_at IS NOT NULL, l.lent_at DESC LIMIT 200`,
    [me.id]
  );
  res.json(loans);
});

// Ödünç ver: { book_id, lent_to_user_id? | lent_to_name? }
loanRoutes.post("/", async (req, res) => {
  const me = currentUser(req);
  const { book_id, lent_to_user_id, lent_to_name } = req.body || {};
  const book = await queryOne<{ user_id: number }>("SELECT user_id FROM books WHERE id=$1", [Number(book_id)]);
  if (!book) return res.status(404).json({ error: "Kitap bulunamadı" });
  if (book.user_id !== me.id) return res.status(403).json({ error: "Sadece kendi kitabınızı ödünç verebilirsiniz" });
  const active = await queryOne("SELECT id FROM loans WHERE book_id=$1 AND returned_at IS NULL", [Number(book_id)]);
  if (active) return res.status(400).json({ error: "Bu kitap zaten ödünçte" });
  if (!lent_to_user_id && !lent_to_name) return res.status(400).json({ error: "Kime verildiği belirtilmeli" });
  const rows = await query<{ id: number }>(
    "INSERT INTO loans(book_id,lent_to_user_id,lent_to_name) VALUES($1,$2,$3) RETURNING id",
    [Number(book_id), lent_to_user_id ? Number(lent_to_user_id) : null, lent_to_name || ""]
  );
  res.json({ id: rows[0].id });
});

// İade al
loanRoutes.post("/:id/return", async (req, res) => {
  const me = currentUser(req);
  const loan = await queryOne<{ id: number; user_id: number }>(
    "SELECT l.id, b.user_id FROM loans l JOIN books b ON b.id=l.book_id WHERE l.id=$1",
    [Number(req.params.id)]
  );
  if (!loan) return res.status(404).json({ error: "Kayıt bulunamadı" });
  if (loan.user_id !== me.id && me.role !== "admin") return res.status(403).json({ error: "Yetki yok" });
  await query("UPDATE loans SET returned_at=now() WHERE id=$1", [Number(req.params.id)]);
  res.json({ ok: true });
});
// ref: f6ad6b0aec90415fe3a16bae361a6e49⁠​‍⁠⁠⁠‌‍‍‍⁠‌‌‍‍⁠​​‍‍⁠‍⁠​‍‌​​‌​​‌‌‌⁠⁠⁠‍​⁠‍‍​‌‌‍‍⁠‍‍⁠‍​⁠‌‍​‌‍‍‌‍⁠‍‌​‍‌
