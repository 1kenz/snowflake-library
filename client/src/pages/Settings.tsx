import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { get, post, put } from "../api";
import { applyTheme, getThemePref, ThemePref } from "../theme";
import { useAuth } from "../AuthContext";
import { useI18n, LANGS } from "../i18n";

const PROVIDER_INFO: Record<string, { label: string; placeholder: string }> = {
  claude: { label: "Claude (Anthropic)", placeholder: "sk-ant-…" },
  openai: { label: "OpenAI (ChatGPT)", placeholder: "sk-…" },
  gemini: { label: "Gemini (Google)", placeholder: "AIza…" },
};

export default function Settings() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [theme, setTheme] = useState<ThemePref>(getThemePref());
  const [goal, setGoal] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [keys, setKeys] = useState<Record<string, string>>({ claude: "", openai: "", gemini: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    get("/settings").then(setSettings).catch(() => {});
    get("/stats/dashboard").then((d) => setGoal(String(d.goal))).catch(() => {});
  }, []);

  function pickTheme(t: ThemePref) { setTheme(t); applyTheme(t); }

  function flash(m: string) { setMsg(m); setErr(""); setTimeout(() => setMsg(""), 3000); }
  function fail(m: string) { setErr(m); setMsg(""); }

  async function saveGoal() {
    try { await put("/stats/goal", { target_books: Number(goal) }); flash(t("set.goalSaved")); }
    catch (e: any) { fail(e.message); }
  }

  async function saveKey(provider: string) {
    try {
      await put("/settings", { [`${provider}_api_key`]: keys[provider] });
      setSettings(await get("/settings"));
      setKeys((k) => ({ ...k, [provider]: "" }));
      flash(t("set.keySaved"));
    } catch (e: any) { fail(e.message); }
  }

  async function clearKey(provider: string) {
    try {
      await put("/settings", { [`${provider}_api_key`]: "" });
      setSettings(await get("/settings"));
      flash(t("set.keyRemoved"));
    } catch (e: any) { fail(e.message); }
  }

  async function setPrimary(provider: string) {
    try {
      await put("/settings", { ai_primary: provider });
      setSettings(await get("/settings"));
    } catch (e: any) { fail(e.message); }
  }

  async function exportData() {
    const res = await fetch("/api/settings/export", { credentials: "same-origin" });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kitapligim-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  async function importData(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const r = await post("/settings/import", data);
      flash(t("set.importedN", { n: r.imported }));
    } catch (e: any) { fail(t("set.importFail", { msg: e.message })); }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h2>{t("set.title")}</h2>

      {user?.role === "admin" && (
        <Link to="/admin" className="card" style={{ marginBottom: 14, display: "block", textDecoration: "none", color: "inherit" }}>
          <h4 style={{ margin: 0 }}>🛡️ {t("admin.title")}</h4>
          <p className="muted" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>{t("admin.openHint")}</p>
        </Link>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <h4>{t("set.appearance")}</h4>
        <div className="seg">
          {([["light", t("set.light")], ["dark", t("set.dark")], ["system", t("set.system")]] as [ThemePref, string][]).map(([v, label]) => (
            <button key={v} className={theme === v ? "on" : ""} onClick={() => pickTheme(v)}>{label}</button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>{t("set.sysNote")}</p>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h4>{t("set.langTitle")}</h4>
        <div className="seg">
          {LANGS.map((l) => (
            <button key={l.code} className={lang === l.code ? "on" : ""} onClick={() => setLang(l.code)}>{l.label}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h4>{t("set.goal")}</h4>
        <div className="row" style={{ gap: 10, justifyContent: "flex-start" }}>
          <input type="number" min={1} style={{ width: 110 }} value={goal} onChange={(e) => setGoal(e.target.value)} />
          <span className="muted" style={{ fontSize: 13 }}>{t("set.perYear")}</span>
          <button className="btn sm" onClick={saveGoal}>{t("common.save")}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h4>{t("set.aiTitle")}</h4>
        <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
          {t("set.aiDesc")}{" "}
          {settings?.ai_enabled
            ? <span className="pill p-g">{t("set.aiActive")}{settings.fallback_chain?.length > 1 ? t("set.aiRedundant") : ""}</span>
            : <span className="pill p-y">{t("set.aiOff")}</span>}
        </p>
        {settings?.fallback_chain?.length > 1 && (
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            {t("set.chain")} {settings.fallback_chain.map((p: string) => PROVIDER_INFO[p]?.label || p).join(" → ")}
          </p>
        )}
        {(["claude", "openai", "gemini"] as const).map((p) => {
          const prov = settings?.providers?.[p];
          return (
            <div key={p} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div className="row" style={{ marginBottom: 6 }}>
                <b style={{ fontSize: 14 }}>
                  {PROVIDER_INFO[p].label}
                  {prov?.enabled && <span className="pill p-g" style={{ marginLeft: 8 }}>{t("set.aiActive")} · {prov.masked}</span>}
                  {prov?.enabled && settings?.primary === p && <span className="pill p-b" style={{ marginLeft: 6 }}>{t("set.primary")}</span>}
                </b>
                {prov?.enabled && user?.role === "admin" && (
                  <span style={{ display: "flex", gap: 6 }}>
                    {settings?.primary !== p && (
                      <button className="btn gh sm" onClick={() => setPrimary(p)}>{t("set.makePrimary")}</button>
                    )}
                    <button className="btn gh sm" onClick={() => clearKey(p)}>{t("set.remove")}</button>
                  </span>
                )}
              </div>
              {user?.role === "admin" && (
                <div className="row" style={{ gap: 10 }}>
                  <input type="password" placeholder={PROVIDER_INFO[p].placeholder}
                    value={keys[p]} onChange={(e) => setKeys((k) => ({ ...k, [p]: e.target.value }))} />
                  <button className="btn sm" onClick={() => saveKey(p)} disabled={!keys[p]?.trim()}>{t("common.save")}</button>
                </div>
              )}
            </div>
          );
        })}
        {user?.role !== "admin" && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{t("set.adminOnlyKeys")}</p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h4>{t("set.backup")}</h4>
        <div className="topbtns">
          <button className="btn gh sm" onClick={exportData}>{t("set.export")}</button>
          <button className="btn gh sm" onClick={() => importRef.current?.click()}>{t("set.import")}</button>
          <input ref={importRef} type="file" accept=".json" hidden
            onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{t("set.backupNote")}</p>
      </div>

      {msg && <div className="ok-msg">{msg}</div>}
      {err && <div className="err">{err}</div>}

      <button className="btn danger" style={{ marginTop: 16 }} onClick={logout}>{t("set.logout")}</button>
    </div>
  );
}
// ref: 240a627ac0eb737db0b5e306f92fae7e⁠​‍⁠​‍‌​​​‍‍‌‍​‍‌⁠‍‍⁠​​​⁠‍‍⁠‌⁠​⁠‌⁠⁠‌‍⁠​​‍⁠‌‌⁠‍​⁠​​‌‍⁠⁠‍‌​‍⁠⁠‍‍⁠‍‌⁠⁠‍
