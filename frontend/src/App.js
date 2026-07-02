import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { useState, useEffect } from 'react';

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import NewTransfer from "@/pages/NewTransfer";
import TransferHistory from "@/pages/TransferHistory";
import TransferDetails from "@/pages/TransferDetails";
import AdminDashboard from "@/pages/AdminDashboard";
import Profile from "@/pages/Profile";
import TrackTransfer from "@/pages/TrackTransfer";

// Auth
import { AuthProvider, useAuth } from "@/context/AuthContext";

/* ── Loader plein écran ── */
const FullPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#050505]">
    <div className="loader" />
  </div>
);

/* ── Route protégée (authentification requise) ── */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.is_admin) return <Navigate to="/dashboard" replace />;
  return children;
};

/* ── Route publique (redirige si déjà connecté) ── */
/*const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user)    return <Navigate to={user.is_admin ? "/admin" : "/dashboard"} replace />;
  return children;
};*/

/* ── Route publique (redirige si déjà connecté) ── */
const PublicRoute = ({ children }) => {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (user && location.pathname === "/") {
      logout();
    }
  }, [user, location.pathname, logout]);

  if (loading) return <FullPageLoader />;

  // on ne redirige PAS vers le dashboard, on laisse le useEffect faire le logout.
  if (user && location.pathname !== "/") {
    return <Navigate to={user.is_admin ? "/admin" : "/dashboard"} replace />;
  }

  return children;
};

function AppRoutes() {
  // On synchronise l'état global dès le départ avec le localStorage
  const [lang, setLang] = useState(() => localStorage.getItem('prestige_lang') || 'fr');

  // Met à jour le localStorage si la langue change depuis n'importe où (comme la Navbar)
  useEffect(() => {
    localStorage.setItem('prestige_lang', lang);
  }, [lang]);

  return (
    <Routes>
      {/* ── Pages publiques ── */}
      <Route path="/" element={<Landing />} />
      <Route path="/track" element={<TrackTransfer />} />
      <Route path="/track/:tracking_number" element={<TrackTransfer />} />

      {/* PublicRoute ajoutée autour de Login pour éviter les conflits d'états */}
      <Route path="/login" element={<PublicRoute><Login onLangChange={setLang} /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* ── Pages utilisateur protégées ── */}
      {/* Réintégration essentielle de <ProtectedRoute> autour du Dashboard */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard lang={lang} setLang={setLang} />
        </ProtectedRoute>
      } />
      <Route path="/new-transfer" element={<ProtectedRoute><NewTransfer /></ProtectedRoute>} />
      <Route path="/transfers" element={<ProtectedRoute><TransferHistory /></ProtectedRoute>} />
      <Route path="/transfers/:id" element={<ProtectedRoute><TransferDetails /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* ── Admin ── */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />

      {/* ── Catch-all ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="app-container">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0F0F0F',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#F5F5F0',
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;