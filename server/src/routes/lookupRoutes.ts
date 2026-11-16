import { Router } from "express";
import { requireAuth } from "../auth.js";

export const lookupRoutes = Router();
lookupRoutes.use(requireAuth);

interface BookInfo {
  title: string;
  author: string;
  publisher: string;
  publish_year: number | null;
  page_count: number | null;
  isbn: string;
  language: string;
  description: string;
  categories: string[];
  cover_url: string;
  source: string;
}

function fromGoogleVolume(v: any): BookInfo {
  const info = v.volumeInfo || {};
  const ids = info.industryIdentifiers || [];
  const isbn = ids.find((i: any) => i.type === "ISBN_13")?.identifier || ids.find((i: any) => i.type === "ISBN_10")?.identifier || "";
  let cover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "";
  cover = cover.replace("http://", "https://").replace("&edge=curl", "");
  return {
    title: info.title || "",
    author: (info.authors || []).join(", "),
    publisher: info.publisher || "",
    publish_year: info.publishedDate ? parseInt(info.publishedDate.slice(0, 4)) || null : null,
    page_count: info.pageCount || null,
    isbn,
    language: info.language || "",
    description: info.description || "",
    categories: info.categories || [],
    cover_url: cover,
    source: "Google Books",
  };
}

async function googleByIsbn(isbn: string): Promise<BookInfo | null> {
  const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const data = await r.json();
  if (!data.items?.length) return null;
  return fromGoogleVolume(data.items[0]);
}

async function openLibraryByIsbn(isbn: string): Promise<BookInfo | null> {
  const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "SnowFlakeShelf/1.0" } });
  if (!r.ok) return null;
  const data = await r.json();
  const b = data[`ISBN:${isbn}`];
  if (!b) return null;
  return {
    title: b.title || "",
    author: (b.authors || []).map((a: any) => a.name).join(", "),
    publisher: (b.publishers || []).map((p: any) => p.name).join(", "),
    publish_year: b.publish_date ? parseInt(String(b.publish_date).match(/\d{4}/)?.[0] || "") || null : null,
    page_count: b.number_of_pages || null,
    isbn,
    language: "",
    description: "",
    categories: (b.subjects || []).slice(0, 5).map((s: any) => s.name),
    cover_url: b.cover?.large || b.cover?.medium || "",
    source: "Open Library",
  };
}

// ISBN ile sorgula⁠​‍⁠​⁠​‍⁠‌‌​⁠‍⁠‍⁠‍‍⁠‌‍‍‍‌​⁠‍⁠‌​⁠​‍​‍⁠⁠‍‌‍‌​​​‌⁠‍​‍⁠​⁠‍‌⁠‍‌⁠‌⁠⁠‍⁠‌‍‍⁠
lookupRoutes.get("/isbn/:isbn", async (req, res) => {
  const isbn = req.params.isbn.replace(/[^0-9Xx]/g, "");
  if (isbn.length < 10) return res.status(400).json({ error: "Geçersiz ISBN" });
  try {
    let result = await googleByIsbn(isbn).catch(() => null);
    if (!result) result = await openLibraryByIsbn(isbn).catch(() => null);
    if (!result) return res.status(404).json({ error: "Bu ISBN ile kitap bulunamadı" });
    res.json(result);
  } catch (e: any) {
    res.status(502).json({ error: "Arama servisine ulaşılamadı: " + e.message });
  }
});

async function googleSearch(q: string): Promise<BookInfo[]> {
  const r = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=6&printType=books`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!r.ok) throw new Error(`Google Books ${r.status}`);
  const data = await r.json();
  return (data.items || []).map(fromGoogleVolume).filter((b: BookInfo) => b.title);
}

async function openLibrarySearch(q: string): Promise<BookInfo[]> {
  const r = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=title,author_name,first_publish_year,isbn,cover_i,publisher,number_of_pages_median`,
    { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "SnowFlakeShelf/1.0" } }
  );
  if (!r.ok) throw new Error(`Open Library ${r.status}`);
  const data = await r.json();
  return (data.docs || []).map((d: any): BookInfo => ({
    title: d.title || "",
    author: (d.author_name || []).slice(0, 2).join(", "),
    publisher: (d.publisher || [])[0] || "",
    publish_year: d.first_publish_year || null,
    page_count: d.number_of_pages_median || null,
    isbn: (d.isbn || []).find((i: string) => i.length === 13) || (d.isbn || [])[0] || "",
    language: "",
    description: "",
    categories: [],
    cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : "",
    source: "Open Library",
  })).filter((b: BookInfo) => b.title);
}

// Metinle ara (kapak tanıma sonucu veya elle arama) — çoklu sonuç, yedekli
lookupRoutes.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.status(400).json({ error: "Arama metni gerekli" });
  const errors: string[] = [];
  try {
    const results = await googleSearch(q);
    if (results.length) return res.json(results);
    errors.push("Google Books: sonuç yok");
  } catch (e: any) {
    errors.push("Google Books: " + e.message);
  }
  try {
    const results = await openLibrarySearch(q);
    if (results.length) return res.json(results);
    errors.push("Open Library: sonuç yok");
  } catch (e: any) {
    errors.push("Open Library: " + e.message);
  }
  res.status(502).json({ error: "Arama yapılamadı — " + errors.join(" | ") });
});
// ref: 32d4eeeb6a4ed322f9901e2ce79dfb6b⁠​‍⁠​⁠​‍⁠‌‌​⁠‍⁠‍⁠‍‍⁠‌‍‍‍‌​⁠‍⁠‌​⁠​‍​‍⁠⁠‍‌‍‌​​​‌⁠‍​‍⁠​⁠‍‌⁠‍‌⁠‌⁠⁠‍⁠‌‍‍⁠
