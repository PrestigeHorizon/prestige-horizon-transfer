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
  PlusCircle, ArrowUpRight, Wallet, Send, Languages
} from 'lucide-react';
import mtnLogo  from '../images/providers/mtn-momo.png';
import moovLogo from '../images/providers/moov-money.png';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/* ─── Dictionnaire de traduction ─── */
const DICTIONARY = {
  fr: {
    title: 'Historique des transferts',
    subtitle: 'Tous vos envois Canada ↔ Bénin',
    newTransferBtn: 'Nouveau transfert',
    searchPlaceholder: 'Nom, téléphone ou numéro de suivi…',
    statusPlaceholder: 'Statut',
    corridorPlaceholder: 'Corridor',
    allStatuses: 'Tous les statuts',
    allCorridors: 'Tous les corridors',
    c2bLabel: '🇨🇦 → 🇧🇯 Canada → Bénin',
    b2cLabel: '🇧🇯 → 🇨🇦 Bénin → Canada',
    transfersCount: 'Transferts',
    noTransferYet: "Aucun transfert pour l'instant",
    noResult: 'Aucun résultat',
    initiateFirst: 'Initiez votre premier envoi Canada ↔ Bénin',
    tryModifyFilters: 'Essayez de modifier vos filtres',
    makeFirstTransfer: 'Faire mon premier transfert',
    impossibleLoad: 'Impossible de charger vos transferts',
    stats: { total: 'Total', ongoing: 'En cours', completed: 'Complétés' },
    statuses: {
      pending: 'En attente',
      payment_received: 'Paiement reçu',
      processing: 'En traitement',
      completed: 'Complété',
      cancelled: 'Annulé',
      failed: 'Échoué'
    },
    delivery: {
      bank_transfer: 'Virement bancaire',
      interac: 'Interac'
    }
  },
  en: {
    title: 'Transfer History',
    subtitle: 'All your Canada ↔ Benin transfers',
    newTransferBtn: 'New Transfer',
    searchPlaceholder: 'Name, phone number or tracking code…',
    statusPlaceholder: 'Status',
    corridorPlaceholder: 'Corridor',
    allStatuses: 'All statuses',
    allCorridors: 'All corridors',
    c2bLabel: '🇨🇦 → 🇧🇯 Canada → Benin',
    b2cLabel: '🇧🇯 → 🇨🇦 Benin → Canada',
    transfersCount: 'Transfers',
    noTransferYet: 'No transfers yet',
    noResult: 'No results found',
    initiateFirst: 'Initiate your first Canada ↔ Benin shipment',
    tryModifyFilters: 'Try expanding your filters',
    makeFirstTransfer: 'Make my first transfer',
    impossibleLoad: 'Unable to load transfers',
    stats: { total: 'Total', ongoing: 'In progress', completed: 'Completed' },
    statuses: {
      pending: 'Pending',
      payment_received: 'Payment received',
      processing: 'Processing',
      completed: 'Completed',
      cancelled: 'Cancelled',
      failed: 'Failed'
    },
    delivery: {
      bank_transfer: 'Bank Transfer',
      interac: 'Interac'
    }
  }
};

const STATUS_META = {
  pending:           { color: 'text-amber-400',  bg: 'bg-amber-400/10',   Icon: Clock },
  payment_received:  { color: 'text-blue-400',   bg: 'bg-blue-400/10',    Icon: Wallet },
  processing:        { color: 'text-purple-400', bg: 'bg-purple-400/10',  Icon: Loader2 },
  completed:         { color: 'text-green-400',  bg: 'bg-green-400/10',   Icon: CheckCircle },
  cancelled:         { color: 'text-zinc-400',   bg: 'bg-zinc-400/10',    Icon: AlertCircle },
  failed:            { color: 'text-red-400',    bg: 'bg-red-400/10',     Icon: AlertCircle },
};

const DELIVERY_ASSETS = {
  mtn:           { logo: mtnLogo,  color: '#FFCC00', label: 'MTN MoMo',          initials: null },
  moov:          { logo: moovLogo, color: '#00a51b', label: 'Moov Money',         initials: null },
  bank_transfer: { logo: null,     color: '#D4AF37', label: 'bank_transfer',     initials: 'VB' },
  interac:       { logo: null,     color: '#D4AF37', label: 'interac',           initials: 'IC' },
};

// Formateurs de monnaies dynamiques
const fmtCAD = (n, lang) => new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
const fmtXOF = (n, lang) => new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
const fmt    = (n, cur, lang) => cur === 'CAD' ? fmtCAD(n, lang) : fmtXOF(n, lang);

// Formatage de la date selon la langue active
const fmtDate = (d, lang) => new Date(d).toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

/* ── Delivery chip ── */
const DeliveryChip = ({ method, t }) => {
  const a = DELIVERY_ASSETS[method] || {};
  if (a.logo) return <img src={a.logo} alt={a.label} className="h-7 w-auto object-contain" />;
  
  // Traduction dynamique du libellé d'initiales
  const fallbackLabel = t.delivery[method] || method;
  return (
    <div className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ background: `${a.color}20`, color: a.color }}
      title={fallbackLabel}>
      {a.initials}
    </div>
  );
};

/* ── Status badge ── */
const StatusBadge = ({ status, t }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  const label = t.statuses[status] || status;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${m.color} ${m.bg}`}>
      <m.Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
};

/* ════════════════════════════════════════════════════ */
const TransferHistory = ({ onLangChange }) => {
  const { user } = useAuth();
  const [lang, setLang] = useState(() => localStorage.getItem('prestige_lang') || 'fr');

  useEffect(() => {
    document.title = lang === 'fr'
      ? "Historique des transferts | Prestige Money Transfer"
      : "Transfer History | Prestige Money Transfer";
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('prestige_lang', lang);
    if (onLangChange) onLangChange(lang);
  }, [lang, onLangChange]);

  const t = DICTIONARY[lang];

  const [transfers,         setTransfers]         = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [statusFilter,      setStatusFilter]      = useState('all');
  const [corridorFilter,    setCorridorFilter]    = useState('all');
  const [searchQuery,       setSearchQuery]       = useState('');

  const fetchTransfers = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/api/transfers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransfers(data);
    } catch {
      toast.error(t.impossibleLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransfers(); }, []);

  useEffect(() => {
    let f = [...transfers];
    if (statusFilter  !== 'all') f = f.filter((item) => item.status   === statusFilter);
    if (corridorFilter !== 'all') f = f.filter((item) => item.corridor === corridorFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter((item) =>
        item.receiver_name?.toLowerCase().includes(q) ||
        item.receiver_phone?.includes(q) ||
        item.tracking_number?.toLowerCase().includes(q)
      );
    }
    setFilteredTransfers(f);
  }, [transfers, statusFilter, corridorFilter, searchQuery]);

  /* ── Stats rapides ── */
  const total     = transfers.length;
  const active    = transfers.filter((item) => ['pending', 'payment_received', 'processing'].includes(item.status)).length;
  const completed = transfers.filter((item) => item.status === 'completed').length;

  return (
    <div className="transferHistory min-h-screen bg-[#050505]" data-testid="transfer-history-page">
      <Navbar lang={lang} setLang={setLang} />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* ── Header avec sélecteur local de langue ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">{t.title}</h1>
            <p className="text-white mt-1">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
              className="border-white/10 text-white hover:bg-white/5 flex items-center gap-2"
            >
              <Languages className="w-4 h-4 text-[#D4AF37]" />
              <span>{lang === 'fr' ? 'English' : 'Français'}</span>
            </Button>
            <Link to="/new-transfer">
              <Button className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold" data-testid="new-transfer-btn">
                <PlusCircle className="w-4 h-4 mr-2" />
                {t.newTransferBtn}
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Mini stats ── */}
        {total > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: t.stats.total,     value: total,     color: 'text-white' },
              { label: t.stats.ongoing,   value: active,    color: 'text-amber-400' },
              { label: t.stats.completed, value: completed, color: 'text-green-400' },
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
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#1A1A1A] border-white/10 text-white focus:border-[#D4AF37]"
                data-testid="search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-[#1A1A1A] border-white/10 text-white" data-testid="status-filter">
                <Filter className="w-4 h-4 mr-2 text-[#A1A1AA]" />
                <SelectValue placeholder={t.statusPlaceholder} />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                <SelectItem value="all" className="text-white">{t.allStatuses}</SelectItem>
                {Object.keys(STATUS_META).map((key) => (
                  <SelectItem key={key} value={key} className="text-white">
                    {t.statuses[key] || key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={corridorFilter} onValueChange={setCorridorFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-[#1A1A1A] border-white/10 text-white" data-testid="corridor-filter">
                <SelectValue placeholder={t.corridorPlaceholder} />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                <SelectItem value="all"             className="text-white">{t.allCorridors}</SelectItem>
                <SelectItem value="canada_to_benin" className="text-white">{t.c2bLabel}</SelectItem>
                <SelectItem value="benin_to_canada" className="text-white">{t.b2cLabel}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Liste ── */}
        <div className="glass-card rounded-2xl overflow-hidden" data-testid="transfers-list">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
            <h2 className="text-white font-semibold">
              {t.transfersCount}{' '}
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
                {transfers.length === 0 ? t.noTransferYet : t.noResult}
              </p>
              <p className="text-[#A1A1AA] text-sm mb-6">
                {transfers.length === 0 ? t.initiateFirst : t.tryModifyFilters}
              </p>
              {transfers.length === 0 && (
                <Link to="/new-transfer">
                  <Button className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold">
                    {t.makeFirstTransfer}
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredTransfers.map((item) => {
                const isC2B = item.corridor === 'canada_to_benin';
                const methodLabel = DELIVERY_ASSETS[item.delivery_method]?.logo 
                  ? DELIVERY_ASSETS[item.delivery_method].label 
                  : (t.delivery[item.delivery_method] || item.delivery_method);

                return (
                  <Link
                    key={item.id}
                    to={`/transfers/${item.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors group"
                    data-testid={`transfer-item-${item.id}`}
                  >
                    {/* Gauche */}
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[#1A1A1A] flex items-center justify-center shrink-0">
                        <DeliveryChip method={item.delivery_method} t={t} />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{item.receiver_name}</p>
                        <p className="text-[#A1A1AA] text-xs mt-0.5">
                          {isC2B ? '🇨🇦→🇧🇯' : '🇧🇯→🇨🇦'} ·{' '}
                          {methodLabel} · {fmtDate(item.created_at, lang)}
                        </p>
                        <p className="text-[#555] text-xs font-mono mt-0.5">{item.tracking_number}</p>
                      </div>
                    </div>

                    {/* Droite */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-white font-semibold text-sm">{fmt(item.send_amount, item.send_currency, lang)}</p>
                        <p className="text-[#D4AF37] text-xs font-medium">{fmt(item.receive_amount, item.receive_currency, lang)}</p>
                      </div>
                      <StatusBadge status={item.status} t={t} />
                      <ArrowUpRight className="w-4 h-4 text-[#555] group-hover:text-[#D4AF37] transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TransferHistory; 