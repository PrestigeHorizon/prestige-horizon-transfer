import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Clock, CheckCircle, AlertCircle, Loader2, Search, Filter,
  Users, DollarSign, TrendingUp, ChevronRight, RefreshCw,
  Wallet, Eye, Image as ImageIcon, ExternalLink, Languages, Mail, Phone, MapPin
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Dictionnaires de traduction locaux
const TRANSLATIONS = {
  fr: {
    dashboardTitle: 'Admin Dashboard',
    dashboardSubtitle: 'Gestion - Prestige Money Transfer',
    searchPlaceholder: 'Nom, téléphone, numéro de tracking…',
    allStatuses: 'Tous les statuts',
    allCorridors: 'Tous les corridors',
    transfersCount: 'Transferts',
    noResultFilter: 'Aucun résultat — modifiez les filtres',
    noTransferYet: 'Aucun transfert pour l\'instant',
    noTransferYetSub: 'Les transferts créés par les utilisateurs apparaîtront ici',
    noTransferMatch: 'Aucun transfert ne correspond aux filtres sélectionnés',
    sender: 'Envoyeur',
    receiver: 'Receveur',
    amounts: 'Montants',
    proof: 'Preuve',
    detail: 'Détail',
    loadingText: 'Chargement des transferts…',
    sessionExpired: 'Session expirée — veuillez vous reconnecter',
    loadError: 'Erreur lors du chargement des données',
    updateSuccess: 'Transfert mis à jour',
    updateError: 'Erreur lors de la mise à jour',
    editTitle: 'Modifier le transfert',
    newStatusLabel: 'Nouveau statut',
    currentSuffix: '(actuel)',
    appliedRateLabel: 'Taux de change appliqué (optionnel)',
    adminNotesLabel: 'Notes admin',
    adminNotesPlaceholder: 'Décaissement effectué le… / Preuve vérifiée…',
    cancel: 'Annuler',
    save: 'Enregistrer',
    proofTitle: 'Preuve de paiement',
    pdfFile: 'Fichier PDF',
    downloadPdf: 'Télécharger le PDF',
    noProofAvailable: 'Aucune preuve de paiement disponible',
    statsTotal: 'Transferts',
    statsPending: 'En cours',
    statsUsers: 'Utilisateurs',
    statsCompleted: 'Terminés',
    volumeCad: 'Volume CAD complété',
    volumeXof: 'Volume XOF complété',
    feesCollected: 'Frais collectés :',
    refresh: 'Actualiser',
    usersListTitle: 'Liste des utilisateurs inscrits',
    searchUserPlaceholder: 'Rechercher un utilisateur (Nom, Email, Tel)...',
    noUsersFound: 'Aucun utilisateur trouvé',
    userJoined: 'Inscrit le'
  },
  en: {
    dashboardTitle: 'Admin Dashboard',
    dashboardSubtitle: 'Management - Prestige Money Transfer',
    searchPlaceholder: 'Name, phone, tracking number…',
    allStatuses: 'All statuses',
    allCorridors: 'All corridors',
    transfersCount: 'Transfers',
    noResultFilter: 'No results — modify filters',
    noTransferYet: 'No transfers yet',
    noTransferYetSub: 'User created transfers will appear here',
    noTransferMatch: 'No transfers match the selected filters',
    sender: 'Sender',
    receiver: 'Receiver',
    amounts: 'Amounts',
    proof: 'Proof',
    detail: 'Detail',
    loadingText: 'Loading transfers…',
    sessionExpired: 'Session expired — please log in again',
    loadError: 'Error loading data',
    updateSuccess: 'Transfer updated successfully',
    updateError: 'Error updating transfer',
    editTitle: 'Edit Transfer',
    newStatusLabel: 'New Status',
    currentSuffix: '(current)',
    appliedRateLabel: 'Applied exchange rate (optional)',
    adminNotesLabel: 'Admin Notes',
    adminNotesPlaceholder: 'Payout processed on… / Proof verified…',
    cancel: 'Cancel',
    save: 'Save',
    proofTitle: 'Payment Proof',
    pdfFile: 'PDF File',
    downloadPdf: 'Download PDF',
    noProofAvailable: 'No payment proof available',
    statsTotal: 'Transfers',
    statsPending: 'Pending',
    statsUsers: 'Users',
    statsCompleted: 'Completed',
    volumeCad: 'Completed CAD Volume',
    volumeXof: 'Completed XOF Volume',
    feesCollected: 'Fees collected:',
    refresh: 'Refresh',
    usersListTitle: 'Registered Users List',
    searchUserPlaceholder: 'Search user (Name, Email, Phone)...',
    noUsersFound: 'No users found',
    userJoined: 'Joined on'
  }
};

const STATUS_META = {
  pending: { label: { fr: 'En attente', en: 'Pending' }, color: 'text-amber-400', bg: 'bg-amber-400/10', Icon: Clock },
  payment_received: { label: { fr: 'Paiement reçu', en: 'Payment received' }, color: 'text-blue-400', bg: 'bg-blue-400/10', Icon: Wallet },
  processing: { label: { fr: 'En traitement', en: 'Processing' }, color: 'text-purple-400', bg: 'bg-purple-400/10', Icon: Loader2 },
  completed: { label: { fr: 'Complété', en: 'Completed' }, color: 'text-green-400', bg: 'bg-green-400/10', Icon: CheckCircle },
  cancelled: { label: { fr: 'Annulé', en: 'Cancelled' }, color: 'text-zinc-400', bg: 'bg-zinc-400/10', Icon: AlertCircle },
  failed: { label: { fr: 'Échoué', en: 'Failed' }, color: 'text-red-400', bg: 'bg-red-400/10', Icon: AlertCircle },
};

const NEXT_STATUSES = {
  pending: ['payment_received', 'cancelled'],
  payment_received: ['processing', 'cancelled', 'failed'],
  processing: ['completed', 'failed'],
  completed: [],
  cancelled: [],
  failed: ['pending'],
};

const DELIVERY_LABELS = {
  mtn: 'MTN MoMo',
  moov: 'Moov Money',
  bank_transfer: { fr: 'Virement bancaire', en: 'Bank Transfer' },
  interac: 'Interac',
};

const PAYMENT_LABELS = {
  interac: 'Interac',
  crypto_usdc: 'USDC',
  bank_transfer: { fr: 'Virement', en: 'Wire Transfer' },
};

const fmtCAD = (n, lang) => new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
const fmtXOF = (n, lang) => new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
const fmt = (n, cur, lang) => cur === 'CAD' ? fmtCAD(n, lang) : fmtXOF(n, lang);
const fmtDate = (d, lang) => new Date(d).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const StatusBadge = ({ status, lang }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${m.color} ${m.bg}`}>
      <m.Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {m.label[lang]}
    </span>
  );
};

/* ════════════════════════════════════════════════════ */
const AdminDashboard = ({ onLangChange }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('prestige_lang') || 'fr');

  useEffect(() => {
    document.title = lang === 'fr'
      ? "Admin Dashboard | Prestige Money Transfer"
      : "Admin Dashboard | Prestige Money Transfer";
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('prestige_lang', lang);
    if (onLangChange) onLangChange(lang);
  }, [lang, onLangChange]);

  const { token } = useAuth();

  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [corridorFilter, setCorridorFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingTransfer, setEditingTransfer] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateData, setUpdateData] = useState({ status: '', admin_notes: '', exchange_rate_applied: '' });

  const [proofModal, setProofModal] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);

  /* États liés à la liste des utilisateurs */
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const t = TRANSLATIONS[lang];

  const toggleLanguage = () => {
    const nextLang = lang === 'fr' ? 'en' : 'fr';
    setLang(nextLang);
    localStorage.setItem('admin_lang', nextLang);
  };

  const authHeader = useCallback(() => {
    const tkn = token || sessionStorage.getItem('token');
    return { Authorization: `Bearer ${tkn}` };
  }, [token]);

  const fetchData = useCallback(async (silent = false) => {
    const activeToken = token || sessionStorage.getItem('token');
    if (!activeToken) return;
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [tRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/transfers`, { headers: authHeader() }),
        axios.get(`${API_URL}/api/admin/stats`, { headers: authHeader() }),
      ]);
      setTransfers(tRes.data);
      setStats(sRes.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        toast.error(t.sessionExpired);
      } else {
        toast.error(t.loadError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, authHeader, t.sessionExpired, t.loadError]);

  useEffect(() => {
    const tokenStr = token || sessionStorage.getItem('token');
    if (tokenStr) fetchData();
  }, [token, fetchData]);

  /* Filtrage */
  useEffect(() => {
    let f = [...transfers];
    if (statusFilter !== 'all') f = f.filter((trans) => trans.status === statusFilter);
    if (corridorFilter !== 'all') f = f.filter((trans) => trans.corridor === corridorFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter((trans) =>
        trans.receiver_name?.toLowerCase().includes(q) ||
        trans.sender_name?.toLowerCase().includes(q) ||
        trans.tracking_number?.toLowerCase().includes(q) ||
        trans.receiver_phone?.includes(q)
      );
    }
    setFilteredTransfers(f);
  }, [transfers, statusFilter, corridorFilter, searchQuery]);

  // Récupérer la liste complète des utilisateurs
  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersModalOpen(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/users`, { headers: authHeader() });
      setUsersList(data);
    } catch (err) {
      toast.error(lang === 'fr' ? "Impossible de charger les utilisateurs" : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  });

  const openEdit = (trans) => {
    setEditingTransfer(trans);
    setUpdateData({ status: trans.status, admin_notes: trans.admin_notes || '', exchange_rate_applied: '' });
  };

  const handleUpdate = async () => {
    setUpdateLoading(true);
    try {
      const payload = { status: updateData.status, admin_notes: updateData.admin_notes || undefined };
      if (updateData.exchange_rate_applied) payload.exchange_rate_applied = parseFloat(updateData.exchange_rate_applied);
      await axios.put(`${API_URL}/api/admin/transfers/${editingTransfer.id}`, payload, { headers: authHeader() });
      toast.success(t.updateSuccess);
      setEditingTransfer(null);
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || t.updateError);
    } finally {
      setUpdateLoading(false);
    }
  };

  const quickTransition = async (transferId, newStatus) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/transfers/${transferId}`,
        { status: newStatus },
        { headers: authHeader() }
      );
      toast.success(`Statut → ${STATUS_META[newStatus]?.label[lang]}`);
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const viewProof = async (transferId) => {
    setProofLoading(true);
    try {
      const { data } = await axios.get(
        `${API_URL}/api/transfers/${transferId}/proof`,
        { headers: authHeader() }
      );
      setProofModal(data);
    } catch {
      toast.error(t.noProofAvailable);
    } finally {
      setProofLoading(false);
    }
  };

  const getMethodLabel = (method, source) => {
    const target = source[method];
    if (!target) return method;
    return typeof target === 'object' ? target[lang] : target;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Navbar lang={lang} setLang={setLang} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
          <p className="text-[#A1A1AA] text-sm">{t.loadingText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="adminDashboard min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-yellow-500/5 pointer-events-none" />
      <Navbar lang={lang} setLang={setLang} />

      <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">{t.dashboardTitle}</h1>
            <p className="text-white mt-1">{t.dashboardSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-[#A1A1AA] hover:text-white hover:border-white/20 transition-all font-medium text-xs bg-[#1A1A1A]"
              title="Change language"
            >
              <Languages className="w-4 h-4 text-[#D4AF37]" />
              {lang.toUpperCase()}
            </button>

            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 rounded-lg border border-white/10 text-white hover:text-white hover:border-white/20 transition-all bg-[#1A1A1A]"
              title={t.refresh}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-[#D4AF37]' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Stats bento ── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: t.statsTotal, value: stats.total_transfers, Icon: TrendingUp, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10', clickable: false },
              { label: t.statsPending, value: stats.by_status?.pending || 0, Icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', clickable: false },
              { label: t.statsUsers, value: stats.total_users, Icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10', clickable: true, onClick: fetchUsers },
              { label: t.statsCompleted, value: stats.by_status?.completed || 0, Icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', clickable: false },
            ].map(({ label, value, Icon, color, bg, clickable, onClick }) => (
              <div
                key={label}
                onClick={clickable ? onClick : undefined}
                className={`
                  bg-zinc-900/90
                  backdrop-blur-sm
                  border border-yellow-500/20
                  rounded-2xl
                  p-6
                  shadow-lg
                  shadow-yellow-500/10
                  hover:border-yellow-500/40
                  transition-all
                  ${clickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
                `}
              >
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">{label}</p>
                <p className={`text-3xl font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Volumes complétés */}
        {stats && (stats.volume_cad_completed > 0 || stats.volume_xof_completed > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t.volumeCad}</p>
                <p className="text-xl font-bold text-green-400">{fmtCAD(stats.volume_cad_completed, lang)}</p>
                <p className="text-xs text-white">{t.feesCollected} {fmtCAD(stats.fees_cad_collected, lang)}</p>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t.volumeXof}</p>
                <p className="text-xl font-bold text-purple-400">{fmtXOF(stats.volume_xof_completed, lang)}</p>
                <p className="text-xs text-white">{t.feesCollected} {fmtXOF(stats.fees_xof_collected, lang)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Filtres ── */}
        <div className="glass-card rounded-2xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#1A1A1A] border-white/10 text-white focus:border-[#D4AF37]"
                data-testid="admin-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-[#1A1A1A] border-white/10 text-white" data-testid="admin-status-filter">
                <Filter className="w-4 h-4 mr-2 text-[#A1A1AA]" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                <SelectItem value="all" className="text-white">{t.allStatuses}</SelectItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-white">{v.label[lang]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={corridorFilter} onValueChange={setCorridorFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-[#1A1A1A] border-white/10 text-white">
                <SelectValue placeholder="Corridor" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                <SelectItem value="all" className="text-white">{t.allCorridors}</SelectItem>
                <SelectItem value="canada_to_benin" className="text-white">🇨🇦 → 🇧🇯 Canada → Bénin</SelectItem>
                <SelectItem value="benin_to_canada" className="text-white">🇧🇯 → 🇨🇦 Bénin → Canada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Liste des transferts ── */}
        <div className="glass-card rounded-2xl overflow-hidden" data-testid="admin-transfers-table">
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-white font-semibold">
              {t.transfersCount}{' '}
              <span className="text-[#A1A1AA] text-sm font-normal">({filteredTransfers.length})</span>
            </h2>
            {transfers.length > 0 && filteredTransfers.length === 0 && (
              <span className="text-[#A1A1AA] text-xs">{t.noResultFilter}</span>
            )}
          </div>

          {transfers.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <TrendingUp className="w-10 h-10 text-[#555] mx-auto" />
              <p className="text-white font-semibold">{t.noTransferYet}</p>
              <p className="text-[#A1A1AA] text-sm">{t.noTransferYetSub}</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-[#A1A1AA] text-sm">
              {t.noTransferMatch}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTransfers.map((tItem) => {
                const nextStates = NEXT_STATUSES[tItem.status] || [];
                return (
                  <div key={tItem.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors" data-testid={`admin-transfer-${tItem.id}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-white text-sm font-medium">
                            {tItem.corridor === 'canada_to_benin' ? '🇨🇦→🇧🇯' : '🇧🇯→🇨🇦'}
                          </p>
                          <p className="text-white text-xs font-mono mt-0.5">{tItem.tracking_number}</p>
                          <p className="text-[#A1A1AA] text-xs mt-0.5">{fmtDate(tItem.created_at, lang)}</p>
                        </div>
                        <div>
                          <p className="text-[#A1A1AA] text-xs">{t.sender}</p>
                          <p className="text-white text-sm font-medium">{tItem.sender_name}</p>
                          <p className="text-[#A1A1AA] text-xs">{tItem.sender_phone}</p>
                        </div>
                        <div>
                          <p className="text-[#A1A1AA] text-xs">{t.receiver}</p>
                          <p className="text-white text-sm font-medium">{tItem.receiver_name}</p>
                          <p className="text-[#A1A1AA] text-xs">
                            {tItem.receiver_phone || tItem.receiver_interac_email || tItem.receiver_bank_account || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#A1A1AA] text-xs">{t.amounts}</p>
                          <p className="text-white text-sm font-semibold">{fmt(tItem.send_amount, tItem.send_currency, lang)}</p>
                          <p className="text-[#D4AF37] text-xs">→ {fmt(tItem.receive_amount, tItem.receive_currency, lang)}</p>
                          <p className="text-white text-xs">
                            {getMethodLabel(tItem.payment_method, PAYMENT_LABELS)} · {getMethodLabel(tItem.delivery_method, DELIVERY_LABELS)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <StatusBadge status={tItem.status} lang={lang} />

                        {tItem.payment_proof_filename && (
                          <button
                            onClick={() => viewProof(tItem.id)}
                            disabled={proofLoading}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 transition-colors"
                            title="Voir preuve de paiement"
                          >
                            <ImageIcon className="w-3 h-3" />
                            {t.proof}
                          </button>
                        )}

                        {nextStates.map((ns) => (
                          <button
                            key={ns}
                            onClick={() => quickTransition(tItem.id, ns)}
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-white/10 hover:border-white/30 transition-colors ${STATUS_META[ns]?.color}`}
                          >
                            <ChevronRight className="w-3 h-3" />
                            {STATUS_META[ns]?.label[lang]}
                          </button>
                        ))}

                        <button
                          onClick={() => openEdit(tItem)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-colors"
                          data-testid={`edit-transfer-${tItem.id}`}
                        >
                          <Eye className="w-3 h-3" />
                          {t.detail}
                        </button>
                      </div>
                    </div>

                    {tItem.admin_notes && (
                      <p className="mt-2 text-xs text-[#A1A1AA] bg-white/5 rounded-lg px-3 py-2">
                        📝 {tItem.admin_notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ══ Dialog : Liste des utilisateurs ══ */}
      <Dialog open={usersModalOpen} onOpenChange={setUsersModalOpen}>
        <DialogContent className="bg-[#0F0F0F] border-white/10 text-white max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-xl">
              <Users className="w-5 h-5 text-[#D4AF37]" />
              {t.usersListTitle}
            </DialogTitle>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
              <Input
                placeholder={t.searchUserPlaceholder}
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9 bg-[#1A1A1A] border-white/10 text-white focus:border-[#D4AF37]"
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-2 min-h-[300px]">
            {usersLoading ? (
              <div className="flex flex-col items-center justify-center pt-12 gap-2">
                <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-[#A1A1AA] text-sm pt-12">{t.noUsersFound}</p>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/[0.08] transition-colors">
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm flex items-center gap-2">
                      {u.full_name}
                      {u.is_admin && <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full font-normal">Admin</span>}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#A1A1AA]">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone || '—'}</span>
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col items-end justify-between md:justify-center text-right text-xs text-[#71717A] gap-1 shrink-0 pt-2 md:pt-0 border-t border-white/5 md:border-0">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {u.country || '—'}</span>
                    <span>{t.userJoined} {u.created_at ? new Date(u.created_at).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA') : '—'}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUsersModalOpen(false)} className="border-white/10 text-white hover:bg-white/5 w-full md:w-auto">
              {t.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Dialog : éditer un transfert ══ */}
      <Dialog open={!!editingTransfer} onOpenChange={() => setEditingTransfer(null)}>
        <DialogContent className="bg-[#0F0F0F] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {t.editTitle}{' '}
              <span className="text-[#A1A1AA] text-sm font-normal">{editingTransfer?.tracking_number}</span>
            </DialogTitle>
          </DialogHeader>

          {editingTransfer && (
            <div className="space-y-5 py-2">
              <div className="bg-[#1A1A1A] rounded-xl p-4 space-y-2 text-sm">
                {[
                  { label: t.sender, value: editingTransfer.sender_name },
                  { label: t.receiver, value: editingTransfer.receiver_name },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-[#A1A1AA]">{label}</span>
                    <span className="text-white">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-[#A1A1AA]">{t.amounts}</span>
                  <span className="text-[#D4AF37] font-semibold">
                    {fmt(editingTransfer.send_amount, editingTransfer.send_currency, lang)}
                    {' → '}
                    {fmt(editingTransfer.receive_amount, editingTransfer.receive_currency, lang)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#A1A1AA]">{t.allStatuses.slice(5)}</span>
                  <StatusBadge status={editingTransfer.status} lang={lang} />
                </div>
              </div>

              <div>
                <Label className="text-[#A1A1AA] text-sm mb-2 block">{t.newStatusLabel}</Label>
                <Select value={updateData.status} onValueChange={(v) => setUpdateData((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white" data-testid="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10">
                    <SelectItem value={editingTransfer.status} className="text-white">
                      {STATUS_META[editingTransfer.status]?.label[lang]} {t.currentSuffix}
                    </SelectItem>
                    {(NEXT_STATUSES[editingTransfer.status] || []).map((ns) => (
                      <SelectItem key={ns} value={ns} className="text-white">
                        {STATUS_META[ns]?.label[lang]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {updateData.status === 'completed' && (
                <div>
                  <Label className="text-[#A1A1AA] text-sm mb-2 block">
                    {t.appliedRateLabel}
                  </Label>
                  <Input
                    type="number"
                    placeholder={`Ex : ${editingTransfer.exchange_rate}`}
                    value={updateData.exchange_rate_applied}
                    onChange={(e) => setUpdateData((p) => ({ ...p, exchange_rate_applied: e.target.value }))}
                    className="bg-[#1A1A1A] border-white/10 text-white focus:border-[#D4AF37]"
                  />
                </div>
              )}

              <div>
                <Label className="text-[#A1A1AA] text-sm mb-2 block">{t.adminNotesLabel}</Label>
                <Textarea
                  value={updateData.admin_notes}
                  onChange={(e) => setUpdateData((p) => ({ ...p, admin_notes: e.target.value }))}
                  placeholder={t.adminNotesPlaceholder}
                  className="bg-[#1A1A1A] border-white/10 text-white resize-none focus:border-[#D4AF37]"
                  rows={3}
                  data-testid="edit-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTransfer(null)} className="border-white/10 text-white hover:bg-white/5">
              {t.cancel}
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateLoading || (updateData.status === editingTransfer?.status && !updateData.admin_notes)}
              className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold"
              data-testid="save-update"
            >
              {updateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Dialog : preuve de paiement ══ */}
      <Dialog open={!!proofModal} onOpenChange={() => setProofModal(null)}>
        <DialogContent className="bg-[#0F0F0F] border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#D4AF37]" />
              {t.proofTitle}
            </DialogTitle>
          </DialogHeader>
          {proofModal && (
            <div className="space-y-4">
              <p className="text-[#A1A1AA] text-sm">
                {proofModal.filename}
                {proofModal.uploaded_at && (
                  <> · {new Date(proofModal.uploaded_at).toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA')}</>
                )}
              </p>
              {proofModal.content_type?.startsWith('image/') ? (
                <img
                  src={`data:${proofModal.content_type};base64,${proofModal.data}`}
                  alt="Preuve de paiement"
                  className="w-full rounded-xl border border-white/10 max-h-[60vh] object-contain"
                />
              ) : (
                <div className="p-6 bg-[#1A1A1A] rounded-xl text-center space-y-3">
                  <ExternalLink className="w-10 h-10 text-[#D4AF37] mx-auto" />
                  <p className="text-white text-sm">{t.pdfFile}</p>
                  <a
                    href={`data:${proofModal.content_type};base64,${proofModal.data}`}
                    download={proofModal.filename}
                    className="inline-block px-5 py-2 bg-[#D4AF37] text-black rounded-lg text-sm font-semibold hover:bg-[#B59326]"
                  >
                    {t.downloadPdf}
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;