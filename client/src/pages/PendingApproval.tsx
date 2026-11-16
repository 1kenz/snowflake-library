import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n";
import type { User } from "../api";

export default function PendingApproval({ user }: { user: User }) {
  const { logout } = useAuth();
  const { t } = useI18n();
  const rejected = user.approval_status === "rejected";
  const inactive = user.is_active === false;

  return (
    <div className="authwrap">
      <div className="authcard" style={{ textAlign: "center" }}>
        <div className="logo" style={{ fontSize: 24, marginBottom: 14 }}>❄️ SnowFlake<b>Shelf</b></div>
        <h1>{inactive ? t("login.inactiveTitle") : rejected ? t("login.rejectedTitle") : t("login.pendingTitle")}</h1>
        <p className="sub">{inactive ? t("login.inactiveMsg") : rejected ? t("login.rejectedMsg") : t("login.pendingMsg")}</p>
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>{user.email}</p>
        <button className="btn gh" style={{ width: "100%", marginTop: 18 }} onClick={logout}>{t("set.logout")}</button>
      </div>
    </div>
  );
}
// ref: 45078b9dcc4bd64f4a7ba8f0b62d13e1⁠​‍⁠‌​‌‌​​‌⁠‍​‍⁠‍‌⁠‌⁠​⁠​‌​‍⁠⁠‌‌‍‌​⁠⁠‌​‍‍‌⁠‍⁠‍‍‍​⁠⁠​​‍⁠‌‍​‍⁠‌​‌​⁠⁠‍​‌
