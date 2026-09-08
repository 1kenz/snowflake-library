import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useI18n } from "./i18n";
import LoginPage from "./pages/LoginPage";
import PendingApproval from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import BookDetail from "./pages/BookDetail";
import BookForm from "./pages/BookForm";
import Family from "./pages/Family";
import Quotes from "./pages/Quotes";
import Loans from "./pages/Loans";
import Settings from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";
import ScanModal from "./components/ScanModal";

export default function App() {
  const { user, loading, hasSession } = useAuth();
  const { t } = useI18n();
  const [scanOpen, setScanOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) return <div className="spin" />;
  if (!hasSession && location.pathname !== "/login") return <Navigate to="/login" replace />;

  if (!hasSession) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!user) return <div className="spin" />;

  if (user.approval_status !== "approved" || user.is_active === false || user.is_active === 0) {
    return <PendingApproval user={user} />;
  }

  return (
    <div className="app">
      <header className="hdr">
        <div className="logo" onClick={() => navigate("/")}>❄️ SnowFlake<b>Shelf</b></div>
        <div className="fam" style={{ gap: 10 }}>
          <div className="av" style={{ background: user.avatar_color, marginLeft: 0 }}>
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <span className="muted" style={{ fontSize: 13 }}>{user.name}</span>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/library" element={<Library scope="mine" key="mine" />} />
        <Route path="/family" element={<Family />} />
        <Route path="/wishlist" element={<Library scope="mine" wishlist key="wish" />} />
        <Route path="/book/:id" element={<BookDetail />} />
        <Route path="/add" element={<BookForm />} />
        <Route path="/edit/:id" element={<BookForm />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/settings" element={<Settings />} />
        {user.role === "admin" && <Route path="/admin" element={<AdminPanel />} />}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <nav className="dock">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")}>{t("nav.panel")}</NavLink>
        <NavLink to="/library" className={({ isActive }) => (isActive ? "on" : "")}>{t("nav.books")}</NavLink>
        <a className="cam" onClick={() => setScanOpen(true)}>📷</a>
        <NavLink to="/quotes" className={({ isActive }) => (isActive ? "on" : "")}>{t("nav.notes")}</NavLink>
        <NavLink to="/family" className={({ isActive }) => (isActive ? "on" : "")}>{t("nav.family")}</NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? "on" : "")}>⚙️</NavLink>
      </nav>

      {scanOpen && <ScanModal onClose={() => setScanOpen(false)} />}
    </div>
  );
}
