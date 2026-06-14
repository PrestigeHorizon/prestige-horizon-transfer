import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle, ArrowUpRight, Clock, CheckCircle, AlertCircle,
  Loader2, Send, TrendingUp, Wallet, ArrowRight, RefreshCw,
} from 'lucide-react';
import mtnLogo from '../images/providers/mtn-momo.png';
import moovLogo from '../images/providers/moov-money.png';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DELIVERY_ASSETS = {
  mtn:           { logo: mtnLogo,  color: '#FFCC00', label: 'MTN MoMo' },
  moov:          { logo: moovLogo, color: '#00a51b', label: 'Moov Money' },
  bank_transfer: { color: '#D4AF37', label: 'Virement bancaire', initials: 'VB' },
  interac:       { color: '#D4AF37', label: 'Interac',           initials: 'IC' },
};

const STATUS_META = {
  pending:          { label: 'En attente',    color: 'text-amber-400',  bg: 'bg-amber-400/10',  Icon: Clock },
  payment_received: { label: 'Paiement reçu', color: 'text-blue-400',   bg: 'bg-blue-400/10',   Icon: Wallet },
  processing:       { label: 'En traitement', color: 'text-purple-400', bg: 'bg-purple-400/10', Icon: Loader2 },
  completed:        { label: 'Complété',      color: 'text-green-400',  bg: 'bg-green-400/10',  Icon: CheckCircle },
  cancelled:        { label: 'Annulé',        color: 'text-zinc-400',   bg: 'bg-zinc-400/10',   Icon: AlertCircle },
  failed:           { label: 'Échoué',        color: 'text-red-400',    bg: 'bg-red-400/10',    Icon: AlertCircle },
};

const fmtCAD = (n) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
const fmtXOF = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
const fmt    = (n, cur) => cur === 'CAD' ? fmtCAD(n) : fmtXOF(n);

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-CA', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
});

/* ── Delivery logo/chip ── */
const DeliveryChip = ({ method }) => {
  const a = DELIVERY_ASSETS[method] || {};
  return a.logo ? (
    <img src={a.logo} alt={a.label} className="h-6 w-auto object-contain" />
  ) : (
    <div className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ background: `${a.color}20`, color: a.color }}>{a.initials}</div>
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

const Dashboard = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransfers = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const token = sessionStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/api/transfers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransfers(data);
    } catch (e) {
      
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchTransfers(); }, []);

  /* ── Computed stats ── */
  const stats = {
    total:     transfers.length,
    active:    transfers.filter((t) => ['pending', 'payment_received', 'processing'].includes(t.status)).length,
    completed: transfers.filter((t) => t.status === 'completed').length,
    volCAD:    transfers.filter((t) => t.send_currency === 'CAD' && t.status === 'completed').reduce((s, t) => s + t.send_amount, 0),
    volXOF:    transfers.filter((t) => t.send_currency === 'XOF' && t.status === 'completed').reduce((s, t) => s + t.send_amount, 0),
  };

  const recent = transfers.slice(0, 6);
  const hasTransfers = transfers.length > 0;

  /* ── Status bar (mini chart) ── */
  const byStatus = Object.entries(
    transfers.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {})
  );

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="dashboard-page">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <p className="text-[#A1A1AA] text-sm mb-1">Bienvenue,</p>
            <h1 className="text-3xl font-bold text-white">{user?.full_name?.split(' ')[0] || 'Utilisateur'} 👋</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchTransfers(true)}
              className="p-2 rounded-lg border border-white/10 text-[#A1A1AA] hover:text-white hover:border-white/20 transition-all"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link to="/new-transfer">
              <Button className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold gold-glow-hover" data-testid="new-transfer-btn">
                <PlusCircle className="w-4 h-4 mr-2" />
                Nouveau transfert
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Bento Grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

          {/* Stat 1 — Total */}
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between min-h-[120px]">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-3">
              <Send className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">Total</p>
              <p className="text-3xl font-bold text-white mt-0.5">{stats.total}</p>
            </div>
          </div>

          {/* Stat 2 — En cours */}
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between min-h-[120px]">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">En cours</p>
              <p className="text-3xl font-bold text-amber-400 mt-0.5">{stats.active}</p>
            </div>
          </div>

          {/* Stat 3 — Complétés */}
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between min-h-[120px]">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">Complétés</p>
              <p className="text-3xl font-bold text-green-400 mt-0.5">{stats.completed}</p>
            </div>
          </div>

          {/* Stat 4 — Volume */}
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between min-h-[120px]">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">Volume envoyé</p>
              <p className="text-lg font-bold text-[#D4AF37] mt-0.5 leading-tight">
                {stats.volCAD > 0 ? fmtCAD(stats.volCAD) : '—'}
              </p>
              {stats.volXOF > 0 && (
                <p className="text-xs text-[#A1A1AA]">{fmtXOF(stats.volXOF)}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Bento row 2 : répartition statuts + CTA ── */}
        {hasTransfers && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

            {/* Répartition par statut */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-5">Répartition par statut</p>
              <div className="space-y-3">
                {byStatus.map(([st, count]) => {
                  const m = STATUS_META[st] || STATUS_META.pending;
                  const pct = Math.round((count / stats.total) * 100);
                  return (
                    <div key={st}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-xs font-medium ${m.color}`}>{m.label}</span>
                        <span className="text-xs text-[#A1A1AA]">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${m.bg.replace('/10', '/60')}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA card */}
            <div className="glass-card rounded-2xl p-6 border-[#D4AF37]/20 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                  <Send className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <h3 className="text-white font-semibold mb-2">Envoyer de l&apos;argent</h3>
                <p className="text-[#A1A1AA] text-sm leading-relaxed">
                  Canada → Bénin ou Bénin → Canada. Rapide, sécurisé, validé par notre équipe.
                </p>
              </div>
              <Link to="/new-transfer" className="mt-5 block">
                <Button className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold">
                  Nouveau transfert <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Transferts récents ── */}
        <div className="glass-card rounded-2xl overflow-hidden" data-testid="recent-transfers">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
            <h2 className="text-white font-semibold">Transferts récents</h2>
            <Link to="/transfers">
              <Button variant="ghost" className="text-[#D4AF37] hover:bg-white/5 text-sm h-8 px-3">
                Voir tout <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : !hasTransfers ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <p className="text-white font-semibold mb-1">Aucun transfert pour l&apos;instant</p>
              <p className="text-[#A1A1AA] text-sm mb-6">Initiez votre premier envoi Canada ↔ Bénin</p>
              <Link to="/new-transfer">
                <Button className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold">
                  Faire mon premier transfert
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recent.map((t) => (
                <Link
                  key={t.id}
                  to={`/transfers/${t.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors group"
                  data-testid={`transfer-${t.id}`}
                >
                  {/* Left : mode livraison + infos */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center shrink-0">
                      <DeliveryChip method={t.delivery_method} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{t.receiver_name}</p>
                      <p className="text-[#A1A1AA] text-xs mt-0.5">
                        {t.corridor === 'canada_to_benin' ? '🇨🇦→🇧🇯' : '🇧🇯→🇨🇦'} · {fmtDate(t.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Right : montants + statut */}
                  <div className="flex items-center gap-4">
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

export default Dashboard;