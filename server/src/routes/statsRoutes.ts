import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth, currentUser } from "../auth.js";

export const statsRoutes = Router();
statsRoutes.use(requireAuth);

statsRoutes.get("/dashboard", async (req, res) => {
  const me = currentUser(req);
  const year = new Date().getFullYear();

  const my = await queryOne(
    `SELECT COUNT(*) total,
       SUM(CASE WHEN status='finished' THEN 1 ELSE 0 END) finished,
       SUM(CASE WHEN status='reading' THEN 1 ELSE 0 END) reading,
       SUM(CASE WHEN status='to_read' THEN 1 ELSE 0 END) to_read
     FROM books WHERE user_id=$1 AND is_wishlist=false`,
    [me.id]
  );

  const finishedThisYearRow = await queryOne<{ c: string }>(
    "SELECT COUNT(*) c FROM books WHERE user_id=$1 AND status='finished' AND to_char(finished_at,'YYYY')=$2",
    [me.id, String(year)]
  );
  const finishedThisYear = Number(finishedThisYearRow?.c || 0);

  const goalRow = await queryOne<{ target_books: number }>("SELECT target_books FROM goals WHERE user_id=$1 AND year=$2", [me.id, year]);
  const goal = goalRow?.target_books ?? 12;

  const monthly: { month: number; count: number }[] = [];
  const now = new Date();
  for (let idx = 5; idx >= 0; idx--) {
    const d = new Date(now.getFullYear(), now.getMonth() - idx, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = await queryOne<{ c: string }>(
      "SELECT COUNT(*) c FROM books WHERE user_id=$1 AND status='finished' AND to_char(finished_at,'YYYY-MM')=$2",
      [me.id, ym]
    );
    monthly.push({ month: d.getMonth(), count: Number(row?.c || 0) });
  }

  const thisMonth = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const family = await queryOne(
    `SELECT (SELECT COUNT(*) FROM books WHERE is_wishlist=false) total_books,
       (SELECT COUNT(*) FROM loans WHERE returned_at IS NULL) active_loans,
       (SELECT COUNT(*) FROM notes) total_notes,
       (SELECT COUNT(*) FROM books WHERE status='finished' AND to_char(finished_at,'YYYY-MM')=$1) finished_this_month`,
    [thisMonth]
  );

  const reading = await query(
    `SELECT b.id, b.title, b.author, b.cover_path, b.current_page, b.page_count,
            b.user_id AS owner_id, u.name AS owner_name, u.avatar_color AS owner_color
     FROM books b JOIN users u ON u.id=b.user_id
     WHERE b.status='reading' AND (b.is_private=false OR b.user_id=$1) ORDER BY b.updated_at DESC LIMIT 30`,
    [me.id]
  );

  const genres = await query(
    `SELECT t.name, t.color, COUNT(*) c FROM book_tags bt
     JOIN tags t ON t.id=bt.tag_id JOIN books b ON b.id=bt.book_id
     WHERE b.user_id=$1 GROUP BY t.id, t.name, t.color ORDER BY c DESC LIMIT 8`,
    [me.id]
  );

  res.json({ my, finishedThisYear, goal, year, monthly, family, reading, genres });
});

statsRoutes.put("/goal", async (req, res) => {
  const me = currentUser(req);
  const { target_books } = req.body || {};
  const t = Math.max(1, Math.min(1000, Number(target_books) || 12));
  await query(
    "INSERT INTO goals(user_id,year,target_books) VALUES($1,$2,$3) ON CONFLICT(user_id,year) DO UPDATE SET target_books=EXCLUDED.target_books",
    [me.id, new Date().getFullYear(), t]
  );
  res.json({ ok: true });
});
// ref: 4ee5d7551bb84635454c6304daec8339⁠​‍⁠‌​⁠‍⁠‍‌‌⁠‌‌⁠‌‌‌‌​‌‍⁠‍⁠‍​‌​‌‍​⁠‌‌‌​‌‌‌​⁠​‌‍​⁠​​‌​⁠‌‍‍⁠‍⁠​‍​​⁠​⁠‍‌
