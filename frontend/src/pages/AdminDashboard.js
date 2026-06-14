import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Clock, CheckCircle, AlertCircle, Loader2, Search, Filter,
  Users, DollarSign, TrendingUp, ChevronRight, RefreshCw,
  Wallet, Eye, Image as ImageIcon, ExternalLink,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_META = {
  pending:          { label: 'En attente',    color: 'text-amber-400',  bg: 'bg-amber-400/10',  Icon: Clock },
  payment_received: { label: 'Paiement reçu', color: 'text-blue-400',   bg: 'bg-blue-400/10',   Icon: Wallet },
  processing:       { label: 'En traitement', color: 'text-purple-400', bg: 'bg-purple-400/10', Icon: Loader2 },
  completed:        { label: 'Complété',      color: 'text-green-400',  bg: 'bg-green-400/10',  Icon: CheckCircle },
  cancelled:        { label: 'Annulé',        color: 'text-zinc-400',   bg: 'bg-zinc-400/10',   Icon: AlertCircle },
  failed:           { label: 'Échoué',        color: 'text-red-400',    bg: 'bg-red-400/10',    Icon: AlertCircle },
};

const NEXT_STATUSES = {
  pending:          ['payment_received', 'cancelled'],
  payment_received: ['processing', 'cancelled', 'failed'],
  processing:       ['completed', 'failed'],
  completed:        [],
  cancelled:        [],
  failed:           ['pending'],
};

const DELIVERY_LABELS = {
  mtn:           'MTN MoMo',
  moov:          'Moov Money',
  bank_transfer: 'Virement bancaire',
  interac:       'Interac',
};
const PAYMENT_LABELS = {
  interac:       'Interac',
  crypto_usdc:   'USDC',
  bank_transfer: 'Virement',
};

const fmtCAD = (n) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
const fmtXOF = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
const fmt    = (n, cur) => cur === 'CAD' ? fmtCAD(n) : fmtXOF(n);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-CA', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
});

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${m.color} ${m.bg}`}>
      <m.Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {m.label}
    </span>
  );
};

/* ════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  // ✅ FIX : lire le token depuis le contexte auth (jamais de race condition)
  const { token } = useAuth();

  const [transfers,         setTransfers]         = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [stats,             setStats]             = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [statusFilter,      setStatusFilter]      = useState('all');
  const [corridorFilter,    setCorridorFilter]    = useState('all');
  const [searchQuery,       setSearchQuery]       = useState('');

  const [editingTransfer, setEditingTransfer] = useState(null);
  const [updateLoading,   setUpdateLoading]   = useState(false);
  const [updateData,      setUpdateData]      = useState({ status: '', admin_notes: '', exchange_rate_applied: '' });

  const [proofModal,   setProofModal]   = useState(null);
  const [proofLoading, setProofLoading] = useState(false);

  // ✅ FIX : headers construits à partir du token du contexte (toujours à jour)
  // Lire localStorage directement — disponible immédiatement sans attendre checkAuth
  const authHeader = useCallback(() => {
    const t = token || localStorage.getItem('token');
    return { Authorization: `Bearer ${t}` };
  }, [token]);

  // ✅ FIX : fetchData déclenché quand le token est disponible (pas au montage à vide)
  const fetchData = useCallback(async (silent = false) => {
    const activeToken = token || localStorage.getItem('token');
    if (!activeToken) return;
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [tRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/transfers`, { headers: authHeader() }),
        axios.get(`${API_URL}/api/admin/stats`,     { headers: authHeader() }),
      ]);
      setTransfers(tRes.data);
      setStats(sRes.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        toast.error('Session expirée — veuillez vous reconnecter');
      } else {
        toast.error('Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, authHeader]);

  // Se déclenche dès que le composant monte — lit localStorage en fallback
  useEffect(() => {
    const t = token || localStorage.getItem('token');
    if (t) fetchData();
  }, [token, fetchData]);

  /* Filtrage */
  useEffect(() => {
    let f = [...transfers];
    if (statusFilter  !== 'all') f = f.filter((t) => t.status   === statusFilter);
    if (corridorFilter !== 'all') f = f.filter((t) => t.corridor === corridorFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter((t) =>
        t.receiver_name?.toLowerCase().includes(q) ||
        t.sender_name?.toLowerCase().includes(q)   ||
        t.tracking_number?.toLowerCase().includes(q) ||
        t.receiver_phone?.includes(q)
      );
    }
    setFilteredTransfers(f);
  }, [transfers, statusFilter, corridorFilter, searchQuery]);

  const openEdit = (t) => {
    setEditingTransfer(t);
    setUpdateData({ status: t.status, admin_notes: t.admin_notes || '', exchange_rate_applied: '' });
  };

  const handleUpdate = async () => {
    setUpdateLoading(true);
    try {
      const payload = { status: updateData.status, admin_notes: updateData.admin_notes || undefined };
      if (updateData.exchange_rate_applied) payload.exchange_rate_applied = parseFloat(updateData.exchange_rate_applied);
      await axios.put(`${API_URL}/api/admin/transfers/${editingTransfer.id}`, payload, { headers: authHeader() });
      toast.success('Transfert mis à jour');
      setEditingTransfer(null);
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
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
      toast.success(`Statut → ${STATUS_META[newStatus]?.label}`);
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
      toast.error('Aucune preuve de paiement disponible');
    } finally {
      setProofLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
          <p className="text-[#A1A1AA] text-sm">Chargement des transferts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="admin-dashboard">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-[#A1A1AA] mt-1">Gestion des transferts Prestige Money Transfer</p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-lg border border-white/10 text-[#A1A1AA] hover:text-white hover:border-white/20 transition-all"
            title="Actualiser"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-[#D4AF37]' : ''}`} />
          </button>
        </div>

        {/* ── Stats bento ── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total transferts', value: stats.total_transfers,           Icon: TrendingUp,  color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
              { label: 'En attente',       value: stats.by_status?.pending || 0,   Icon: Clock,       color: 'text-amber-400', bg: 'bg-amber-400/10' },
              { label: 'Utilisateurs',     value: stats.total_users,               Icon: Users,       color: 'text-blue-400',  bg: 'bg-blue-400/10'  },
              { label: 'Complétés',        value: stats.by_status?.completed || 0, Icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
            ].map(({ label, value, Icon, color, bg }) => (
              <div key={label} className="glass-card rounded-2xl p-6">
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
                <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">Volume CAD complété</p>
                <p className="text-xl font-bold text-green-400">{fmtCAD(stats.volume_cad_completed)}</p>
                <p className="text-xs text-[#555]">Frais collectés : {fmtCAD(stats.fees_cad_collected)}</p>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">Volume XOF complété</p>
                <p className="text-xl font-bold text-purple-400">{fmtXOF(stats.volume_xof_completed)}</p>
                <p className="text-xs text-[#555]">Frais collectés : {fmtXOF(stats.fees_xof_collected)}</p>
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
                placeholder="Nom, téléphone, numéro de tracking…"
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
                <SelectItem value="all" className="text-white">Tous les statuts</SelectItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-white">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={corridorFilter} onValueChange={setCorridorFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-[#1A1A1A] border-white/10 text-white">
                <SelectValue placeholder="Corridor" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                <SelectItem value="all"             className="text-white">Tous les corridors</SelectItem>
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
              Transferts{' '}
              <span className="text-[#A1A1AA] text-sm font-normal">({filteredTransfers.length})</span>
            </h2>
            {transfers.length > 0 && filteredTransfers.length === 0 && (
              <span className="text-[#A1A1AA] text-xs">Aucun résultat — modifiez les filtres</span>
            )}
          </div>

          {transfers.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <TrendingUp className="w-10 h-10 text-[#555] mx-auto" />
              <p className="text-white font-semibold">Aucun transfert pour l&apos;instant</p>
              <p className="text-[#A1A1AA] text-sm">Les transferts créés par les utilisateurs apparaîtront ici</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-[#A1A1AA] text-sm">
              Aucun transfert ne correspond aux filtres sélectionnés
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTransfers.map((t) => {
                const nextStates = NEXT_STATUSES[t.status] || [];
                return (
                  <div key={t.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors" data-testid={`admin-transfer-${t.id}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                      {/* Infos */}
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-white text-sm font-medium">
                            {t.corridor === 'canada_to_benin' ? '🇨🇦→🇧🇯' : '🇧🇯→🇨🇦'}
                          </p>
                          <p className="text-[#555] text-xs font-mono mt-0.5">{t.tracking_number}</p>
                          <p className="text-[#A1A1AA] text-xs mt-0.5">{fmtDate(t.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-[#A1A1AA] text-xs">Envoyeur</p>
                          <p className="text-white text-sm font-medium">{t.sender_name}</p>
                          <p className="text-[#A1A1AA] text-xs">{t.sender_phone}</p>
                        </div>
                        <div>
                          <p className="text-[#A1A1AA] text-xs">Receveur</p>
                          <p className="text-white text-sm font-medium">{t.receiver_name}</p>
                          <p className="text-[#A1A1AA] text-xs">
                            {t.receiver_phone || t.receiver_interac_email || t.receiver_bank_account || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#A1A1AA] text-xs">Montants</p>
                          <p className="text-white text-sm font-semibold">{fmt(t.send_amount, t.send_currency)}</p>
                          <p className="text-[#D4AF37] text-xs">→ {fmt(t.receive_amount, t.receive_currency)}</p>
                          <p className="text-[#555] text-xs">
                            {PAYMENT_LABELS[t.payment_method]} · {DELIVERY_LABELS[t.delivery_method]}
                          </p>
                        </div>
                      </div>

                      {/* Statut + actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <StatusBadge status={t.status} />

                        {t.payment_proof_filename && (
                          <button
                            onClick={() => viewProof(t.id)}
                            disabled={proofLoading}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 transition-colors"
                            title="Voir preuve de paiement"
                          >
                            <ImageIcon className="w-3 h-3" />
                            Preuve
                          </button>
                        )}

                        {nextStates.map((ns) => (
                          <button
                            key={ns}
                            onClick={() => quickTransition(t.id, ns)}
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-white/10 hover:border-white/30 transition-colors ${STATUS_META[ns]?.color}`}
                          >
                            <ChevronRight className="w-3 h-3" />
                            {STATUS_META[ns]?.label}
                          </button>
                        ))}

                        <button
                          onClick={() => openEdit(t)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-colors"
                          data-testid={`edit-transfer-${t.id}`}
                        >
                          <Eye className="w-3 h-3" />
                          Détail
                        </button>
                      </div>
                    </div>

                    {t.admin_notes && (
                      <p className="mt-2 text-xs text-[#A1A1AA] bg-white/5 rounded-lg px-3 py-2">
                        📝 {t.admin_notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ══ Dialog : éditer un transfert ══ */}
      <Dialog open={!!editingTransfer} onOpenChange={() => setEditingTransfer(null)}>
        <DialogContent className="bg-[#0F0F0F] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              Modifier le transfert{' '}
              <span className="text-[#A1A1AA] text-sm font-normal">{editingTransfer?.tracking_number}</span>
            </DialogTitle>
          </DialogHeader>

          {editingTransfer && (
            <div className="space-y-5 py-2">
              <div className="bg-[#1A1A1A] rounded-xl p-4 space-y-2 text-sm">
                {[
                  { label: 'Envoyeur', value: editingTransfer.sender_name },
                  { label: 'Receveur', value: editingTransfer.receiver_name },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-[#A1A1AA]">{label}</span>
                    <span className="text-white">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-[#A1A1AA]">Montant</span>
                  <span className="text-[#D4AF37] font-semibold">
                    {fmt(editingTransfer.send_amount, editingTransfer.send_currency)}
                    {' → '}
                    {fmt(editingTransfer.receive_amount, editingTransfer.receive_currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#A1A1AA]">Statut actuel</span>
                  <StatusBadge status={editingTransfer.status} />
                </div>
              </div>

              <div>
                <Label className="text-[#A1A1AA] text-sm mb-2 block">Nouveau statut</Label>
                <Select value={updateData.status} onValueChange={(v) => setUpdateData((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white" data-testid="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10">
                    <SelectItem value={editingTransfer.status} className="text-white">
                      {STATUS_META[editingTransfer.status]?.label} (actuel)
                    </SelectItem>
                    {(NEXT_STATUSES[editingTransfer.status] || []).map((ns) => (
                      <SelectItem key={ns} value={ns} className="text-white">
                        {STATUS_META[ns]?.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {updateData.status === 'completed' && (
                <div>
                  <Label className="text-[#A1A1AA] text-sm mb-2 block">
                    Taux de change appliqué (optionnel)
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
                <Label className="text-[#A1A1AA] text-sm mb-2 block">Notes admin</Label>
                <Textarea
                  value={updateData.admin_notes}
                  onChange={(e) => setUpdateData((p) => ({ ...p, admin_notes: e.target.value }))}
                  placeholder="Décaissement effectué le… / Preuve vérifiée…"
                  className="bg-[#1A1A1A] border-white/10 text-white resize-none focus:border-[#D4AF37]"
                  rows={3}
                  data-testid="edit-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTransfer(null)} className="border-white/10 text-white hover:bg-white/5">
              Annuler
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateLoading || (updateData.status === editingTransfer?.status && !updateData.admin_notes)}
              className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold"
              data-testid="save-update"
            >
              {updateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
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
              Preuve de paiement
            </DialogTitle>
          </DialogHeader>
          {proofModal && (
            <div className="space-y-4">
              <p className="text-[#A1A1AA] text-sm">
                {proofModal.filename}
                {proofModal.uploaded_at && (
                  <> · {new Date(proofModal.uploaded_at).toLocaleString('fr-CA')}</>
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
                  <p className="text-white text-sm">Fichier PDF</p>
                  <a
                    href={`data:${proofModal.content_type};base64,${proofModal.data}`}
                    download={proofModal.filename}
                    className="inline-block px-5 py-2 bg-[#D4AF37] text-black rounded-lg text-sm font-semibold hover:bg-[#B59326]"
                  >
                    Télécharger le PDF
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