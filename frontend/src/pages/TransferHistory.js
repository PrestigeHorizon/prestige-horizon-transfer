import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Clock, CheckCircle, AlertCircle, Loader2, Filter, Search,
  PlusCircle, ArrowUpRight, Wallet, Send,
} from 'lucide-react';
import mtnLogo  from '../images/providers/mtn-momo.png';
import moovLogo from '../images/providers/moov-money.png';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_META = {
  pending:          { label: 'En attente',    color: 'text-amber-400',  bg: 'bg-amber-400/10',  Icon: Clock },
  payment_received: { label: 'Paiement reçu', color: 'text-blue-400',   bg: 'bg-blue-400/10',   Icon: Wallet },
  processing:       { label: 'En traitement', color: 'text-purple-400', bg: 'bg-purple-400/10', Icon: Loader2 },
  completed:        { label: 'Complété',      color: 'text-green-400',  bg: 'bg-green-400/10',  Icon: CheckCircle },
  cancelled:        { label: 'Annulé',        color: 'text-zinc-400',   bg: 'bg-zinc-400/10',   Icon: AlertCircle },
  failed:           { label: 'Échoué',        color: 'text-red-400',    bg: 'bg-red-400/10',    Icon: AlertCircle },
};

const DELIVERY_ASSETS = {
  mtn:           { logo: mtnLogo,  color: '#FFCC00', label: 'MTN MoMo',         initials: null },
  moov:          { logo: moovLogo, color: '#00a51b', label: 'Moov Money',        initials: null },
  bank_transfer: { logo: null,     color: '#D4AF37', label: 'Virement bancaire', initials: 'VB' },
  interac:       { logo: null,     color: '#D4AF37', label: 'Interac',           initials: 'IC' },
};

const fmtCAD = (n) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
const fmtXOF = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
const fmt    = (n, cur) => cur === 'CAD' ? fmtCAD(n) : fmtXOF(n);

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-CA', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

/* ── Delivery chip ── */
const DeliveryChip = ({ method }) => {
  const a = DELIVERY_ASSETS[method] || {};
  if (a.logo) return <img src={a.logo} alt={a.label} className="h-7 w-auto object-contain" />;
  return (
    <div className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ background: `${a.color}20`, color: a.color }}>
      {a.initials}
    </div>
  );
};

/* ── Status badge ── */
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
const TransferHistory = () => {
  const { user } = useAuth();
  const [transfers,         setTransfers]         = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [statusFilter,      setStatusFilter]      = useState('all');
  const [corridorFilter,    setCorridorFilter]    = useState('all');
  const [searchQuery,       setSearchQuery]       = useState('');

  const fetchTransfers = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/api/transfers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransfers(data);
    } catch {
      toast.error('Impossible de charger vos transferts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransfers(); }, []);

  useEffect(() => {
    let f = [...transfers];
    if (statusFilter  !== 'all') f = f.filter((t) => t.status   === statusFilter);
    if (corridorFilter !== 'all') f = f.filter((t) => t.corridor === corridorFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter((t) =>
        t.receiver_name?.toLowerCase().includes(q) ||
        t.receiver_phone?.includes(q) ||
        t.tracking_number?.toLowerCase().includes(q)
      );
    }
    setFilteredTransfers(f);
  }, [transfers, statusFilter, corridorFilter, searchQuery]);

  /* ── Stats rapides ── */
  const total     = transfers.length;
  const active    = transfers.filter((t) => ['pending', 'payment_received', 'processing'].includes(t.status)).length;
  const completed = transfers.filter((t) => t.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="transfer-history-page">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Historique des transferts</h1>
            <p className="text-[#A1A1AA] mt-1">Tous vos envois Canada ↔ Bénin</p>
          </div>
          <Link to="/new-transfer">
            <Button className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold" data-testid="new-transfer-btn">
              <PlusCircle className="w-4 h-4 mr-2" />
              Nouveau transfert
            </Button>
          </Link>
        </div>

        {/* ── Mini stats ── */}
        {total > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total',      value: total,     color: 'text-white' },
              { label: 'En cours',   value: active,    color: 'text-amber-400' },
              { label: 'Complétés',  value: completed, color: 'text-green-400' },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[#A1A1AA] text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Filtres ── */}
        <div className="glass-card rounded-2xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
              <Input
                placeholder="Nom, téléphone ou numéro de suivi…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#1A1A1A] border-white/10 text-white focus:border-[#D4AF37]"
                data-testid="search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-[#1A1A1A] border-white/10 text-white" data-testid="status-filter">
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
              <SelectTrigger className="w-full md:w-[200px] bg-[#1A1A1A] border-white/10 text-white" data-testid="corridor-filter">
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

        {/* ── Liste ── */}
        <div className="glass-card rounded-2xl overflow-hidden" data-testid="transfers-list">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
            <h2 className="text-white font-semibold">
              Transferts{' '}
              <span className="text-[#A1A1AA] text-sm font-normal">({filteredTransfers.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <p className="text-white font-semibold mb-1">
                {transfers.length === 0 ? 'Aucun transfert pour l\'instant' : 'Aucun résultat'}
              </p>
              <p className="text-[#A1A1AA] text-sm mb-6">
                {transfers.length === 0
                  ? 'Initiez votre premier envoi Canada ↔ Bénin'
                  : 'Essayez de modifier vos filtres'}
              </p>
              {transfers.length === 0 && (
                <Link to="/new-transfer">
                  <Button className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold">
                    Faire mon premier transfert
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTransfers.map((t) => (
                <Link
                  key={t.id}
                  to={`/transfers/${t.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors group"
                  data-testid={`transfer-item-${t.id}`}
                >
                  {/* Gauche */}
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#1A1A1A] flex items-center justify-center shrink-0">
                      <DeliveryChip method={t.delivery_method} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{t.receiver_name}</p>
                      <p className="text-[#A1A1AA] text-xs mt-0.5">
                        {t.corridor === 'canada_to_benin' ? '🇨🇦→🇧🇯' : '🇧🇯→🇨🇦'} ·{' '}
                        {DELIVERY_ASSETS[t.delivery_method]?.label} · {fmtDate(t.created_at)}
                      </p>
                      <p className="text-[#555] text-xs font-mono mt-0.5">{t.tracking_number}</p>
                    </div>
                  </div>

                  {/* Droite */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-white font-semibold text-sm">{fmt(t.send_amount, t.send_currency)}</p>
                      <p className="text-[#D4AF37] text-xs font-medium">{fmt(t.receive_amount, t.receive_currency)}</p>
                    </div>
                    <StatusBadge status={t.status} />
                    <ArrowUpRight className="w-4 h-4 text-[#555] group-hover:text-[#D4AF37] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TransferHistory;