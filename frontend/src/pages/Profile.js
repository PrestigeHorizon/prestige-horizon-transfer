import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  User, Mail, Phone, MapPin, Shield, LogOut,
  Eye, EyeOff, Lock, CheckCircle2, Send, Clock, Languages // Ajout de Languages ici
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/* ── Ligne info ── */
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-[#A1A1AA]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">{label}</p>
      <p className="text-white text-sm font-medium truncate mt-0.5">{value || '—'}</p>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════ */
const Profile = ({ onLangChange }) => {

  const [lang, setLang] = useState(() => localStorage.getItem('prestige_lang') || 'fr');

  useEffect(() => {
    document.title = lang === 'fr'
      ? "Profil | Prestige Money Transfer"
      : "Profile | Prestige Money Transfer";
  }, [lang]); // Se déclenche au chargement et si la langue change

  // Fonction pour basculer la langue et avertir le composant parent
  const toggleLang = () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    setLang(newLang);
    localStorage.setItem('prestige_lang', newLang);
    if (onLangChange) onLangChange(newLang);
    toast.success(newLang === 'fr' ? 'Langue modifiée en Français' : 'Language switched to English');
  };

  const { user, logout } = useAuth();

  /* Modification téléphone */
  const [editPhone, setEditPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  /* Changement de mot de passe */
  const [pwSection, setPwSection] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwData, setPwData] = useState({ old_password: '', new_password: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Déconnexion réussie');
  };

  const handlePhoneSave = async () => {
    if (!newPhone.trim()) return;
    setPhoneLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`${API_URL}/api/auth/update-phone`, { phone: newPhone }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Numéro mis à jour ! Reconnectez-vous pour voir le changement.');
      setEditPhone(false);
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 405) {
        toast.info('Mise à jour disponible prochainement. Contactez le support si urgent.');
      } else {
        toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (pwData.new_password.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (pwData.new_password !== pwData.confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setPwLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`${API_URL}/api/auth/change-password`, {
        old_password: pwData.old_password,
        new_password: pwData.new_password,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Mot de passe changé avec succès !');
      setPwSection(false);
      setPwData({ old_password: '', new_password: '', confirm: '' });
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 405) {
        toast.info('Changement de mot de passe disponible prochainement.');
      } else {
        toast.error(err.response?.data?.detail || 'Erreur — vérifiez votre mot de passe actuel');
      }
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) return null;

  const initials = user.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const memberSince = new Date(user.created_at).toLocaleDateString('fr-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="profile-page">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">

        {/* ── Header Ajusté avec bouton de langue ── */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {lang === 'fr' ? 'Mon profil' : 'My Profile'}
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              {lang === 'fr' ? 'Gérez vos informations et votre sécurité' : 'Manage your information and security'}
            </p>
          </div>

          {/* Bouton de switch de langue */}
          <Button
            onClick={toggleLang}
            variant="outline"
            className="self-start sm:self-auto border-white/10 bg-white/5 hover:bg-white/10 text-white hover:text-white transition-all text-xs h-9 px-3 font-medium flex items-center gap-2"
          >
            <Languages className="w-4 h-4 text-[#D4AF37]" />
            <span>{lang === 'fr' ? 'English (EN)' : 'Français (FR)'}</span>
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Colonne gauche : carte identité ── */}
          <div className="space-y-5">

            {/* Avatar + nom */}
            <Card className="bg-[#0F0F0F] border-white/10 text-center" data-testid="profile-card">
              <CardContent className="pt-8 pb-6 space-y-4">
                <div className="relative inline-block mx-auto">
                  <div className="w-20 h-20 rounded-full bg-[#D4AF37] flex items-center justify-center mx-auto">
                    <span className="text-black font-bold text-2xl">{initials}</span>
                  </div>
                  {user.is_admin && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center border-2 border-[#0F0F0F]">
                      <Shield className="w-3 h-3 text-black" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">{user.full_name}</p>
                  <p className="text-[#A1A1AA] text-sm">{user.email}</p>
                  {user.is_admin && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full">
                      <Shield className="w-3 h-3" /> {lang === 'fr' ? 'Administrateur' : 'Administrator'}
                    </span>
                  )}
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-1.5 text-[#555] text-xs">
                  <Clock className="w-3 h-3" />
                  {lang === 'fr' ? `Membre depuis ${memberSince}` : `Member since ${memberSince}`}
                </div>
              </CardContent>
            </Card>

            {/* Accès rapide */}
            <Card className="bg-[#0F0F0F] border-white/10">
              <CardContent className="p-4 space-y-2">
                <Link to="/new-transfer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                    <Send className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <span className="text-white text-sm font-medium">
                    {lang === 'fr' ? 'Nouveau transfert' : 'New Transfer'}
                  </span>
                </Link>
                <Link to="/transfers" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#A1A1AA]" />
                  </div>
                  <span className="text-white text-sm font-medium">
                    {lang === 'fr' ? 'Historique' : 'History'}
                  </span>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* ── Colonne droite : informations ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Informations du compte */}
            <Card className="bg-[#0F0F0F] border-white/10" data-testid="account-info">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base">
                  {lang === 'fr' ? 'Informations du compte' : 'Account Information'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow icon={User} label={lang === 'fr' ? "Nom complet" : "Full Name"} value={user.full_name} />
                <InfoRow icon={Mail} label="Email" value={user.email} />
                <InfoRow icon={MapPin} label={lang === 'fr' ? "Pays" : "Country"} value={user.country} data-testid="profile-country" />

                {/* Téléphone — éditable */}
                <div className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-[#A1A1AA]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">
                      {lang === 'fr' ? 'Téléphone' : 'Phone'}
                    </p>
                    {editPhone ? (
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder={user.phone}
                          className="bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white text-sm h-8"
                          data-testid="profile-phone-input"
                        />
                        <Button size="sm" onClick={handlePhoneSave} disabled={phoneLoading}
                          className="bg-[#D4AF37] text-black hover:bg-[#B59326] text-xs h-8 px-3">
                          {phoneLoading ? '…' : <CheckCircle2 className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditPhone(false)}
                          className="text-[#A1A1AA] hover:text-white h-8 px-2 text-xs">
                          {lang === 'fr' ? 'Annuler' : 'Cancel'}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium font-mono mt-0.5" data-testid="profile-phone">
                          {user.phone}
                        </p>
                        <button onClick={() => { setNewPhone(user.phone); setEditPhone(true); }}
                          className="text-xs text-[#D4AF37] hover:underline shrink-0 ml-4">
                          {lang === 'fr' ? 'Modifier' : 'Edit'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sécurité */}
            <Card className="bg-[#0F0F0F] border-white/10" data-testid="security-section">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base">
                    {lang === 'fr' ? 'Sécurité' : 'Security'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Changer mot de passe */}
                <div className="p-4 bg-[#1A1A1A] rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#A1A1AA]" />
                      <p className="text-white text-sm font-medium">
                        {lang === 'fr' ? 'Mot de passe' : 'Password'}
                      </p>
                    </div>
                    <button
                      onClick={() => setPwSection((p) => !p)}
                      className="text-xs text-[#D4AF37] hover:underline"
                    >
                      {pwSection ? (lang === 'fr' ? 'Annuler' : 'Cancel') : (lang === 'fr' ? 'Changer' : 'Change')}
                    </button>
                  </div>

                  {pwSection && (
                    <div className="space-y-3 pt-1">
                      <div className="relative">
                        <Input
                          type={showOld ? 'text' : 'password'}
                          placeholder={lang === 'fr' ? "Mot de passe actuel" : "Current password"}
                          value={pwData.old_password}
                          onChange={(e) => setPwData((p) => ({ ...p, old_password: e.target.value }))}
                          className="pr-10 bg-[#0F0F0F] border-white/10 focus:border-[#D4AF37] text-white text-sm"
                        />
                        <button type="button" onClick={() => setShowOld((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white">
                          {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          type={showNew ? 'text' : 'password'}
                          placeholder={lang === 'fr' ? "Nouveau mot de passe (min. 6 car.)" : "New password (min. 6 char.)"}
                          value={pwData.new_password}
                          onChange={(e) => setPwData((p) => ({ ...p, new_password: e.target.value }))}
                          className="pr-10 bg-[#0F0F0F] border-white/10 focus:border-[#D4AF37] text-white text-sm"
                        />
                        <button type="button" onClick={() => setShowNew((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white">
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Input
                        type="password"
                        placeholder={lang === 'fr' ? "Confirmer le nouveau mot de passe" : "Confirm new password"}
                        value={pwData.confirm}
                        onChange={(e) => setPwData((p) => ({ ...p, confirm: e.target.value }))}
                        className={`bg-[#0F0F0F] border-white/10 focus:border-[#D4AF37] text-white text-sm ${pwData.confirm && pwData.confirm !== pwData.new_password ? 'border-red-500/50' : ''
                          }`}
                      />
                      {pwData.confirm && pwData.confirm !== pwData.new_password && (
                        <p className="text-red-400 text-xs">
                          {lang === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match'}
                        </p>
                      )}
                      <Button
                        onClick={handlePasswordChange}
                        disabled={pwLoading || !pwData.old_password || !pwData.new_password || pwData.new_password !== pwData.confirm}
                        className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold text-sm h-9"
                      >
                        {pwLoading ? (lang === 'fr' ? 'Enregistrement…' : 'Saving…') : (lang === 'fr' ? 'Enregistrer le nouveau mot de passe' : 'Save new password')}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Déconnexion */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#1A1A1A] rounded-xl">
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-white text-sm font-medium">
                        {lang === 'fr' ? 'Se déconnecter' : 'Log out'}
                      </p>
                      <p className="text-[#A1A1AA] text-xs">
                        {lang === 'fr' ? 'Quitter la session sur cet appareil' : 'Leave session on this device'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleLogout}
                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {lang === 'fr' ? 'Se déconnecter' : 'Log out'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;