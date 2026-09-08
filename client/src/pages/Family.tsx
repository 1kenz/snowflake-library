import { useEffect, useState } from "react";
import { get, User } from "../api";
import Library from "./Library";
import { useI18n } from "../i18n";

export default function Family() {
  const [members, setMembers] = useState<User[]>([]);
  const { t } = useI18n();
  useEffect(() => { get<User[]>("/users").then(setMembers).catch(() => {}); }, []);

  return (
    <>
      <div className="fam" style={{ marginBottom: 4 }}>
        {members.filter((m) => m.is_active !== false).map((m) => (
          <div key={m.id} className="av" title={m.name} style={{ background: m.avatar_color }}>
            {m.name.slice(0, 1).toUpperCase()}
          </div>
        ))}
        <span className="muted" style={{ marginLeft: 14, fontSize: 13 }}>{t("family.members", { n: members.filter((m) => m.is_active !== false).length })}</span>
      </div>
      <Library scope="family" key="family" />
    </>
  );
}
