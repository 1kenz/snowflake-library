import { useEffect, useState } from "react";
import { get, post, put, del, User } from "../api";
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n";

interface PendingUser {
  id: string; email: string; name: string; avatar_color: string; created_at: string;
}

export default function AdminPanel() {
  const { user: me } = useAuth();
  const { t } = useI18n();
  const [requireApproval, setRequireApproval] = useState(false);
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", is_child: false });

  function flash(m: string) { setMsg(m); setErr(""); setTimeout(() => setMsg(""), 3000); }
  function fail(m: string) { setErr(m); setMsg(""); }

  async function loadAll() {
    try {
      const [s, p, m] = await Promise.all([
        get<{ require_approval: boolean }>("/admin/settings"),
        get<PendingUser[]>("/admin/pending"),
        get<User[]>("/users"),
      ]);
      setRequireApproval(s.require_approval);
      setPending(p);
      setMembers(m);
    } catch (e: any) { fail(e.message); }
  }

  useEffect(() => { loadAll(); }, []);

  async function toggleRequireApproval() {
    try {
      await put("/admin/settings", { require_approval: !requireApproval });
      setRequireApproval((v) => !v);
      flash(t("admin.toggleSaved"));
    } catch (e: any) { fail(e.message); }
  }

  async function approve(id: string) {
    try { await post(`/admin/approve/${id}`); await loadAll(); flash(t("admin.approved")); }
    catch (e: any) { fail(e.message); }
  }

  async function reject(id: string) {
    if (!confirm(t("admin.rejectConfirm"))) return;
    try { await post(`/admin/reject/${id}`); await loadAll(); flash(t("admin.rejected")); }
    catch (e: any) { fail(e.message); }
  }

  async function toggleActive(m: User) {
    try { await put(`/users/${m.id}`, { is_active: m.is_active === 0 || m.is_active === false }); await loadAll(); }
    catch (e: any) { fail(e.message); }
  }

  async function toggleRole(m: User) {
    const newRole = m.role === "admin" ? "member" : "admin";
    if (!confirm(t("admin.roleConfirm", { name: m.name, role: newRole === "admin" ? t("set.admin") : t("admin.member") }))) return;
    try { await put(`/admin/role/${m.id}`, { role: newRole }); await loadAll(); flash(t("admin.roleSaved")); }
    catch (e: any) { fail(e.message); }
  }

  function startEdit(m: User) {
    setEditId(m.id);
    setEditForm({ name: m.name, is_child: !!m.is_child });
  }

  async function saveMember() {
    if (!editId) return;
    try {
      await put(`/users/${editId}`, { name: editForm.name, is_child: editForm.is_child });
      setEditId(null);
      await loadAll();
      flash(t("set.memberSaved"));
    } catch (e: any) { fail(e.message); }
  }

  async function deleteMember(m: User) {
    if (!confirm(t("set.delMemberConfirm", { name: m.name }))) return;
    try { await del(`/admin/users/${m.id}`); await loadAll(); flash(t("set.memberDeleted")); }
    catch (e: any) { fail(e.message); }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h2>{t("admin.title")}</h2>

      <div className="card" style={{ marginBottom: 14 }}>
        <h4>{t("admin.approvalGateTitle")}</h4>
        <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{t("admin.approvalGateDesc")}</p>
        <button
          className={"btn " + (requireApproval ? "" : "gh")}
          onClick={toggleRequireApproval}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <span className={"switch " + (requireApproval ? "on" : "")} aria-hidden="true" />
          {requireApproval ? t("admin.approvalOn") : t("admin.approvalOff")}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h4>{t("admin.pendingTitle")}</h4>
        {pending.length === 0 && <p className="muted" style={{ fontSize: 13 }}>{t("admin.noPending")}</p>}
        {pending.map((p) => (
          <div key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div className="row">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="av" style={{ background: p.avatar_color, marginLeft: 0 }}>{p.name.slice(0, 1).toUpperCase()}</div>
                <div><b style={{ fontSize: 14 }}>{p.name}</b><br /><small className="muted">{p.email}</small></div>
              </div>
              <span style={{ display: "flex", gap: 6 }}>
                <button className="btn sm" onClick={() => approve(p.id)}>{t("admin.approve")}</button>
                <button className="btn danger sm" onClick={() => reject(p.id)}>{t("admin.reject")}</button>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h4>{t("set.members")}</h4>
        {members.map((m) => (
          <div key={m.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <div className="row">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="av" style={{ background: m.avatar_color, marginLeft: 0, opacity: (m.is_active === 0 || m.is_active === false) ? 0.4 : 1 }}>
                  {m.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <b style={{ fontSize: 14 }}>{m.name}</b>
                  {m.role === "admin" && <span className="pill p-b" style={{ marginLeft: 8 }}>{t("set.admin")}</span>}
                  {!!m.is_child && <span className="pill p-y" style={{ marginLeft: 8 }}>{t("set.childPill")}</span>}
                  {(m.is_active === 0 || m.is_active === false) && <span className="pill p-m" style={{ marginLeft: 8 }}>{t("set.passive")}</span>}
                  <br /><small className="muted">{m.email}</small>
                </div>
              </div>
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button className="btn gh sm" onClick={() => (editId === m.id ? setEditId(null) : startEdit(m))}>{t("common.edit")}</button>
                {m.id !== me?.id && (
                  <>
                    <button className="btn gh sm" onClick={() => toggleRole(m)}>
                      {m.role === "admin" ? t("admin.demote") : t("admin.promote")}
                    </button>
                    <button className="btn gh sm" onClick={() => toggleActive(m)}>
                      {(m.is_active === 0 || m.is_active === false) ? t("set.activate") : t("set.deactivate")}
                    </button>
                  </>
                )}
              </span>
            </div>
            {editId === m.id && (
              <div style={{ marginTop: 10, background: "var(--card2)", borderRadius: 12, padding: "4px 14px 14px" }}>
                <label>{t("set.name")}</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                {m.role !== "admin" && (
                  <label style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, textTransform: "none" }}>
                    <input type="checkbox" style={{ width: "auto" }} checked={editForm.is_child}
                      onChange={(e) => setEditForm({ ...editForm, is_child: e.target.checked })} /> {t("set.childChk")}
                  </label>
                )}
                <div className="actions">
                  <button className="btn sm" onClick={saveMember} disabled={!editForm.name.trim()}>{t("common.save")}</button>
                  <button className="btn gh sm" onClick={() => setEditId(null)}>{t("common.cancel")}</button>
                  {m.id !== me?.id && m.role !== "admin" && (
                    <button className="btn danger sm" onClick={() => deleteMember(m)}>{t("set.delMember")}</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {msg && <div className="ok-msg">{msg}</div>}
      {err && <div className="err">{err}</div>}
    </div>
  );
}
