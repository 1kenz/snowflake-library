import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, LookupResult, AiInfo } from "../api";
import { Cover } from "./Cover";
import { useI18n } from "../i18n";

type Mode = "menu" | "barcode" | "photo" | "searching" | "results" | "confirm" | "manual";

const SECURE = window.isSecureContext;

/** Fotoğrafı küçült + JPEG data URL'e çevir (AI/OCR için yeterli, yükleme hızlı) */
async function downscale(file: File, maxSide = 1400, quality = 0.85): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** OCR için ön işleme: gri ton + kontrast artırma */
async function preprocessForOcr(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const c = Math.max(0, Math.min(255, (g - 128) * 1.45 + 128)); // kontrast
    px[i] = px[i + 1] = px[i + 2] = c;
  }
  ctx.putImageData(d, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function ScanModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("menu");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);
  const [selected, setSelected] = useState<LookupResult | null>(null);
  const [ai, setAi] = useState<AiInfo | null>(null);
  const [aiState, setAiState] = useState<"idle" | "loading" | "off" | "error">("idle");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [manualQ, setManualQ] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const navigate = useNavigate();

  useEffect(() => {
    get("/settings").then((s) => setAiEnabled(!!s.ai_enabled)).catch(() => {});
    return () => stopRef.current();
  }, []);

  /* ---------- Canlı barkod tarama (yalnızca HTTPS/localhost) ---------- */
  async function startBarcode() {
    if (!SECURE) {
      setErr(t("scan.httpsErr"));
      return;
    }
    setMode("barcode"); setErr(""); setInfo(t("scan.showBarcode"));
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      // Arka kamerayı tercih et
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current!,
        (result) => {
          if (result) {
            const text = result.getText().replace(/[^0-9Xx]/g, "");
            if (text.length >= 10) {
              controls.stop();
              lookupByIsbn(text);
            }
          }
        }
      );
      stopRef.current = () => controls.stop();
    } catch (e: any) {
      setErr(kameraHatasi(e));
      setMode("menu");
    }
  }

  function kameraHatasi(e: any): string {
    if (e?.name === "NotAllowedError") return t("scan.camDenied");
    if (e?.name === "NotFoundError") return t("scan.camNotFound");
    return t("scan.camFail", { msg: String(e?.message || e) });
  }

  /* ---------- Fotoğraf akışı: barkod → AI vision → OCR ---------- */
  async function onPhoto(file: File) {
    setMode("searching"); setErr(""); setInfo(t("scan.processing"));
    let dataUrl: string;
    try {
      dataUrl = await downscale(file);
    } catch {
      setErr(t("scan.photoFail")); setMode("menu"); return;
    }

    // 1) Fotoğrafta barkod var mı? (arka kapak fotoğrafı çekildiyse)
    try {
      setInfo(t("scan.findingBarcode"));
      const isbn = await decodeBarcodeFromImage(dataUrl);
      if (isbn) return lookupByIsbn(isbn);
    } catch { /* barkod yok, devam */ }

    // 2) AI görüntü tanıma (varsa) — en isabetli yöntem
    if (aiEnabled) {
      try {
        setInfo(t("scan.aiLooking"));
        const r = await post<{ title: string; author: string; _provider: string }>("/ai/identify-cover", { image: dataUrl });
        const q = `${r.title} ${r.author}`.trim();
        setManualQ(q);
        setInfo(t("scan.aiFound", { provider: r._provider, q }));
        return await searchText(q, `intitle:${r.title}`);
      } catch (e: any) {
        if (e.code !== "NO_KEY") setInfo(t("scan.aiFailOcr"));
      }
    }

    // 3) OCR (yedek yol)
    try {
      setInfo(t("scan.ocr"));
      const q = await ocrExtract(dataUrl);
      if (!q) throw new Error(t("scan.ocrEmpty"));
      setManualQ(q);
      await searchText(q);
    } catch (e: any) {
      setErr(e.message); setMode("manual");
    }
  }

  async function decodeBarcodeFromImage(dataUrl: string): Promise<string | null> {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const { DecodeHintType } = await import("@zxing/library");
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const result = await reader.decodeFromImageElement(img);
    const text = result.getText().replace(/[^0-9Xx]/g, "");
    return text.length >= 10 ? text : null;
  }

  async function ocrExtract(dataUrl: string): Promise<string> {
    const Tesseract = (await import("tesseract.js")).default;
    const pre = await preprocessForOcr(dataUrl);
    const { data } = await Tesseract.recognize(pre, "tur+eng");
    // Güvenilir kelimeleri satır satır topla; büyük puntolu satırlar (başlık) öne
    const lines = (data.lines || [])
      .map((l: any) => ({
        text: l.text.trim().replace(/\s+/g, " "),
        conf: l.confidence,
        height: l.bbox ? l.bbox.y1 - l.bbox.y0 : 0,
      }))
      .filter((l: any) => l.conf > 45 && l.text.length > 2 && /[a-zA-ZğüşıöçĞÜŞİÖÇ]{3,}/.test(l.text));
    if (!lines.length) {
      // satır verisi yoksa eski yöntem
      return (data.text || "").split("\n").map((s: string) => s.trim())
        .filter((s: string) => s.length > 3 && /[a-zA-ZğüşıöçĞÜŞİÖÇ]{3,}/.test(s))
        .sort((a: string, b: string) => b.length - a.length).slice(0, 2).join(" ").slice(0, 70).trim();
    }
    lines.sort((a: any, b: any) => b.height - a.height);
    return lines.slice(0, 3).map((l: any) => l.text).join(" ").slice(0, 70).trim();
  }

  /* ---------- Aramalar ---------- */
  async function lookupByIsbn(isbn: string) {
    setMode("searching"); setInfo(t("scan.isbnSearch", { isbn })); setErr("");
    try {
      const r = await get<LookupResult>(`/lookup/isbn/${isbn}`);
      choose(r);
    } catch (e: any) {
      setErr(e.message); setMode("menu");
    }
  }

  async function searchText(q: string, _hint?: string) {
    setMode("searching"); setInfo(t("scan.qSearch", { q })); setErr("");
    try {
      const rs = await get<LookupResult[]>(`/lookup/search?q=${encodeURIComponent(q)}`);
      if (!rs.length) throw new Error(t("scan.noMatch"));
      if (rs.length === 1) choose(rs[0]);
      else { setResults(rs); setMode("results"); }
    } catch (e: any) {
      setErr(e.message); setMode("manual");
    }
  }

  /* ---------- Onay + AI künye ---------- */
  function choose(r: LookupResult) {
    stopRef.current();
    setSelected(r); setAi(null); setMode("confirm");
    enrich(r);
  }

  async function enrich(r: LookupResult) {
    setAiState("loading");
    try {
      const a = await post<AiInfo>("/ai/enrich", { title: r.title, author: r.author, description: r.description });
      setAi(a); setAiState("idle");
    } catch (e: any) {
      setAiState(e.code === "NO_KEY" ? "off" : "error");
    }
  }

  async function accept() {
    if (!selected) return;
    let cover_path = "";
    if (selected.cover_url) {
      try { cover_path = (await post("/books/cover/from-url", { url: selected.cover_url })).cover_path; } catch {}
    }
    const prefill = {
      title: selected.title,
      author: selected.author,
      publisher: selected.publisher,
      publish_year: selected.publish_year ?? "",
      page_count: selected.page_count ?? "",
      isbn: selected.isbn,
      language: selected.language || "tr",
      description: selected.description,
      genre: ai?.genre?.join(", ") || selected.categories.slice(0, 3).join(", "),
      audience: ai?.audience || "",
      tags: ai?.themes?.slice(0, 4) || selected.categories.slice(0, 3),
      cover_path,
      ai_summary: ai?.summary || "",
    };
    onClose();
    navigate("/add", { state: { prefill } });
  }

  function retry() {
    setSelected(null); setAi(null); setResults([]); setErr("");
    setMode("manual");
  }

  /* ---------- Render ---------- */
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && (stopRef.current(), onClose())}>
      <div className="modal">
        {mode === "menu" && (
          <>
            <h3>{t("scan.title")}</h3>
            <p className="muted" style={{ fontSize: 13.5, margin: "6px 0 14px" }}>
              {t("scan.how")}
            </p>
            {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
            <div style={{ display: "grid", gap: 10 }}>
              <button className="btn" onClick={() => photoRef.current?.click()}>
                {t("scan.photo")}
              </button>
              <button className="btn gh" onClick={startBarcode}>
                {t("scan.live")}{!SECURE ? t("scan.liveHttps") : ""}
              </button>
              <button className="btn gh" onClick={() => setMode("manual")}>{t("scan.manual")}</button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
              {aiEnabled ? t("scan.tipAi") : t("scan.tipOcr")}
            </p>
            <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; f && onPhoto(f); }} />
            <div className="actions"><button className="btn gh" onClick={onClose}>{t("common.close")}</button></div>
          </>
        )}

        {mode === "barcode" && (
          <>
            <h3>{t("scan.liveTitle")}</h3>
            <p className="scanline">{info}</p>
            <video ref={videoRef} className="scanner" muted playsInline />
            <div className="actions">
              <button className="btn gh" onClick={() => { stopRef.current(); setMode("menu"); }}>{t("common.back")}</button>
            </div>
          </>
        )}

        {mode === "searching" && (
          <>
            <h3>{t("scan.searchTitle")}</h3>
            <p className="scanline">{info}</p>
            <div className="spin" />
          </>
        )}

        {mode === "manual" && (
          <>
            <h3>{t("scan.manual")}</h3>
            <p className="muted" style={{ fontSize: 13 }}>{t("scan.manualSub")}</p>
            {err && <div className="err" style={{ margin: "10px 0" }}>{err}</div>}
            <input autoFocus value={manualQ} onChange={(e) => setManualQ(e.target.value)}
              placeholder={t("scan.manualPh")}
              onKeyDown={(e) => e.key === "Enter" && manualQ.trim() && searchText(manualQ.trim())}
              style={{ marginTop: 8 }} />
            <div className="actions">
              <button className="btn" disabled={manualQ.trim().length < 2} onClick={() => searchText(manualQ.trim())}>{t("scan.searchBtn")}</button>
              <button className="btn gh" onClick={() => photoRef.current?.click()}>{t("scan.newPhoto")}</button>
              <button className="btn gh" onClick={() => { setErr(""); setMode("menu"); }}>{t("common.back")}</button>
            </div>
            <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; f && onPhoto(f); }} />
          </>
        )}

        {mode === "results" && (
          <>
            <h3>{t("scan.multi")}</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{t("scan.pick")}</p>
            {results.map((r, i) => (
              <div key={i} className="nowcard" style={{ marginBottom: 9 }} onClick={() => choose(r)}>
                <Cover title={r.title} path={r.cover_url || undefined} width={44} height={64} fontSize={8} />
                <div style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 14 }}>{r.title}</b><br />
                  <small className="muted">{r.author}{r.publish_year ? ` · ${r.publish_year}` : ""}{r.publisher ? ` · ${r.publisher}` : ""}</small>
                </div>
              </div>
            ))}
            <div className="actions">
              <button className="btn gh" onClick={retry}>{t("scan.retry")}</button>
              <button className="btn gh" onClick={onClose}>{t("common.cancel")}</button>
            </div>
          </>
        )}

        {mode === "confirm" && selected && (
          <>
            <div className="scanline">{t("scan.found")} · {t("scan.source")}: {selected.source}{selected.isbn ? ` · ISBN ${selected.isbn}` : ""}</div>
            <div style={{ display: "flex", gap: 16 }}>
              <Cover title={selected.title} path={selected.cover_url || undefined} width={86} height={128} fontSize={10} />
              <div style={{ minWidth: 0 }}>
                <h3>{selected.title}</h3>
                <p className="muted" style={{ fontSize: 13 }}>
                  {selected.author}{selected.publisher && ` · ${selected.publisher}`}
                  {selected.publish_year && ` · ${selected.publish_year}`}
                  {selected.page_count && ` · ${selected.page_count} sf.`}
                </p>
              </div>
            </div>

            {(ai?.genre?.length || selected.categories.length) ? (
              <div className="blk"><b className="t">{t("scan.genre")}</b>{(ai?.genre || selected.categories).join(" · ")}</div>
            ) : null}

            {aiState === "loading" && (
              <div className="blk"><b className="t">{t("scan.aiTitle")}</b>{t("scan.aiPrep")}</div>
            )}
            {ai && (
              <>
                <div className="blk"><b className="t">{t("scan.summary")} (AI{ai._provider ? ` · ${ai._provider}` : ""})</b>{ai.summary}</div>
                <div className="blk"><b className="t">{t("scan.audience")}</b>{ai.audience}</div>
                {ai.themes?.length > 0 && <div className="blk"><b className="t">{t("scan.themes")}</b>{ai.themes.join(" · ")}</div>}
                {ai.similar?.length > 0 && <div className="blk"><b className="t">{t("scan.similar")}</b>{ai.similar.join(" · ")}</div>}
              </>
            )}
            {aiState === "off" && !selected.description && (
              <div className="blk muted" style={{ fontSize: 12.5 }}>
                {t("scan.aiOff")}
              </div>
            )}
            {aiState === "error" && (
              <div className="blk muted" style={{ fontSize: 12.5 }}>
                {t("scan.aiErr")} <a onClick={() => enrich(selected)} style={{ cursor: "pointer" }}>{t("scan.tryAgain")}</a>
              </div>
            )}
            {!ai && selected.description && (
              <div className="blk"><b className="t">{t("scan.desc")}</b>{selected.description.slice(0, 400)}{selected.description.length > 400 ? "…" : ""}</div>
            )}

            <div className="actions">
              <button className="btn" onClick={accept}>{t("scan.accept")}</button>
              <button className="btn gh" onClick={retry}>{t("scan.retry")}</button>
              <button className="btn gh" onClick={onClose}>✕ {t("common.cancel")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
