import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Clock, CheckCircle, AlertCircle, Loader2,
  ArrowRight, Package, Wallet, RefreshCw, Home,
} from 'lucide-react';
import logoImg from '../images/white_logo_Prestige_horizon_bg.png';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_META = {
  pending:          { label: 'En attente de paiement', color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/30',  Icon: Clock,         step: 1 },
  payment_received: { label: 'Paiement reçu',          color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/30',   Icon: Wallet,        step: 2 },
  processing:       { label: 'En cours de traitement', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', Icon: Loader2,       step: 3 },
  completed:        { label: 'Transfert complété',     color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/30',  Icon: CheckCircle,   step: 4 },
  cancelled:        { label: 'Annulé',                 color: 'text-zinc-400',   bg: 'bg-zinc-400/10',   border: 'border-zinc-400/30',   Icon: AlertCircle,   step: 0 },
  failed:           { label: 'Échoué',                 color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/30',    Icon: AlertCircle,   step: 0 },
};

const STEPS = [
  { key: 'pending',          label: 'Paiement initié',    desc: 'Le client a initié le transfert' },
  { key: 'payment_received', label: 'Paiement confirmé',  desc: 'Notre équipe a reçu le paiement' },
  { key: 'processing',       label: 'Décaissement',       desc: 'Envoi vers le receveur en cours' },
  { key: 'completed',        label: 'Livré',              desc: 'Le receveur a encaissé les fonds' },
];

const fmtCAD = (n) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
const fmtXOF = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
const fmt    = (n, cur) => cur === 'CAD' ? fmtCAD(n) : fmtXOF(n);

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-CA', {
  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

/* ── Barre de progression ── */
const ProgressBar = ({ status }) => {
  const meta = STATUS_META[status];
  const terminal = ['cancelled', 'failed'].includes(status);
  if (terminal) return null;

  return (
    <div className="space-y-6">
      {STEPS.map((s, i) => {
        const stepNum = i + 1;
        const done    = meta.step > stepNum;
        const active  = meta.step === stepNum;
        const sMeta   = STATUS_META[s.key];
        return (
          <div key={s.key} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                done   ? 'bg-[#D4AF37] border-[#D4AF37]' :
                active ? `${sMeta.bg} ${sMeta.border}` :
                         'bg-[#1A1A1A] border-white/10'
              }`}>
                {done
                  ? <CheckCircle className="w-4 h-4 text-black" />
                  : <sMeta.Icon className={`w-4 h-4 ${active ? sMeta.color : 'text-[#555]'} ${active && s.key === 'processing' ? 'animate-spin' : ''}`} />
                }
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-px h-8 mt-1 ${done ? 'bg-[#D4AF37]/60' : 'bg-white/10'}`} />
              )}
            </div>
            <div className="pt-1.5">
              <p className={`text-sm font-semibold ${done ? 'text-[#D4AF37]' : active ? sMeta.color : 'text-[#555]'}`}>
                {s.label}
              </p>
              <p className={`text-xs mt-0.5 ${active ? 'text-[#A1A1AA]' : 'text-[#555]'}`}>{s.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ════════════════════════════════════════════════════ */
const TrackTransfer = () => {
  const { tracking_number: urlTracking } = useParams();
  const navigate = useNavigate();

  const [query,   setQuery]   = useState(urlTracking || '');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [searched, setSearched] = useState(false);

  /* Déclencher la recherche automatiquement si on arrive avec un tracking dans l'URL */
  useState(() => {
    if (urlTracking) handleSearch(urlTracking);
  });

  async function handleSearch(trackingNum) {
    const q = (trackingNum || query).trim().toUpperCase();
    if (!q) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSearched(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/track/${q}`);
      setResult(data);
      // mettre à jour l'URL sans recharger
      if (q !== urlTracking) navigate(`/track/${q}`, { replace: true });
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Numéro de suivi introuvable. Vérifiez le numéro et réessayez.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  const onKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };
  const meta = result ? STATUS_META[result.status] || STATUS_META.pending : null;
  const terminal = result && ['cancelled', 'failed'].includes(result.status);

  return (
    <div className="min-h-screen bg-[#050505]">

      {/* ── Navbar minimale ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/">
            <img src={logoImg} alt="Prestige Horizon" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-[#A1A1AA] hover:text-white text-sm">
                Se connecter
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold text-sm">
                S&apos;inscrire
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">

        {/* ── Hero titre ── */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto mb-5">
            <Package className="w-7 h-7 text-[#D4AF37]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Suivre un transfert</h1>
          <p className="text-[#A1A1AA] text-sm max-w-sm mx-auto leading-relaxed">
            Entrez votre numéro de suivi pour connaître l&apos;état de votre envoi Canada ↔ Bénin
          </p>
        </div>

        {/* ── Barre de recherche ── */}
        <div className="glass-card rounded-2xl p-4 mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                onKeyDown={onKeyDown}
                placeholder="PMT-20240612-XXXXXX"
                className="pl-9 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white font-mono tracking-wider placeholder:tracking-normal placeholder:font-sans"
                data-testid="tracking-input"
              />
            </div>
            <Button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold shrink-0"
              data-testid="track-submit"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowRight className="w-4 h-4" />
              }
            </Button>
          </div>
        </div>

        {/* ── Erreur ── */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-6" data-testid="track-error">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Introuvable</p>
              <p className="text-[#A1A1AA] text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Résultat ── */}
        {result && meta && (
          <div className="space-y-5 animate-fade-in" data-testid="track-result">

            {/* Statut principal */}
            <div className={`rounded-2xl p-5 border ${meta.bg} ${meta.border}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0`}>
                  <meta.Icon className={`w-6 h-6 ${meta.color} ${result.status === 'processing' ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-0.5">Statut actuel</p>
                  <p className={`text-xl font-bold ${meta.color}`}>{meta.label}</p>
                  {result.estimated_time && !terminal && (
                    <p className="text-[#A1A1AA] text-xs mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Délai estimé : {result.estimated_time}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleSearch(result.tracking_number)}
                  className="text-[#555] hover:text-[#D4AF37] transition-colors shrink-0"
                  title="Actualiser"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Montants */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <h2 className="text-white font-semibold text-sm">Détails du transfert</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
                  <p className="text-[#A1A1AA] text-xs mb-1.5">Envoyé</p>
                  <p className="text-white text-lg font-bold">{fmt(result.send_amount, result.send_currency)}</p>
                  <p className="text-[#555] text-xs mt-0.5">{result.send_currency}</p>
                </div>
                <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-4 text-center">
                  <p className="text-[#A1A1AA] text-xs mb-1.5">Le receveur reçoit</p>
                  <p className="text-[#D4AF37] text-lg font-bold">{fmt(result.receive_amount, result.receive_currency)}</p>
                  <p className="text-[#555] text-xs mt-0.5">{result.receive_currency}</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1 border-t border-white/5">
                {[
                  { label: 'Corridor',          value: result.corridor },
                  { label: 'Mode de livraison', value: result.delivery_method },
                  { label: 'Numéro de suivi',   value: result.tracking_number, mono: true },
                  { label: 'Initié le',         value: fmtDate(result.created_at) },
                  { label: 'Dernière mise à jour', value: fmtDate(result.updated_at) },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex justify-between items-start gap-4 text-sm">
                    <span className="text-[#A1A1AA] shrink-0">{label}</span>
                    <span className={`text-white text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Barre de progression */}
            {!terminal && (
              <div className="glass-card rounded-2xl p-5">
                <h2 className="text-white font-semibold text-sm mb-5">Progression</h2>
                <ProgressBar status={result.status} />
              </div>
            )}

            {/* Messages contextuels */}
            {result.status === 'pending' && (
              <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/20 text-sm text-[#A1A1AA] leading-relaxed">
                <p className="font-semibold text-amber-400 mb-1">En attente de votre paiement</p>
                Si vous venez de créer ce transfert, connectez-vous à votre compte pour accéder aux instructions de paiement et envoyer votre preuve.
              </div>
            )}
            {result.status === 'payment_received' && (
              <div className="p-4 rounded-xl bg-blue-400/5 border border-blue-400/20 text-sm text-[#A1A1AA] leading-relaxed">
                <p className="font-semibold text-blue-400 mb-1">Paiement confirmé !</p>
                Notre équipe a reçu votre paiement et prépare le décaissement. Vous serez notifié dès que les fonds sont envoyés.
              </div>
            )}
            {result.status === 'processing' && (
              <div className="p-4 rounded-xl bg-purple-400/5 border border-purple-400/20 text-sm text-[#A1A1AA] leading-relaxed">
                <p className="font-semibold text-purple-400 mb-1">Décaissement en cours</p>
                Les fonds sont en route vers le receveur. Le délai dépend du mode de livraison choisi.
              </div>
            )}
            {result.status === 'completed' && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-sm text-[#A1A1AA] leading-relaxed">
                <p className="font-semibold text-green-400 mb-1">Transfert complété avec succès 🎉</p>
                Le receveur a encaissé les fonds. Merci de faire confiance à Prestige Money Transfer.
              </div>
            )}
            {terminal && (
              <div className={`p-4 rounded-xl text-sm leading-relaxed ${
                result.status === 'cancelled'
                  ? 'bg-zinc-400/5 border border-zinc-400/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <p className={`font-semibold mb-1 ${result.status === 'cancelled' ? 'text-zinc-400' : 'text-red-400'}`}>
                  {result.status === 'cancelled' ? 'Transfert annulé' : 'Transfert échoué'}
                </p>
                <span className="text-[#A1A1AA]">
                  Pour toute question, contactez notre support en vous connectant à votre compte.
                </span>
              </div>
            )}

            {/* CTA */}
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="flex-1">
                <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 text-sm">
                  Se connecter pour gérer
                </Button>
              </Link>
              <Link to="/" className="shrink-0">
                <Button variant="ghost" className="text-[#A1A1AA] hover:text-white">
                  <Home className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── État vide initial ── */}
        {!searched && !result && (
          <div className="text-center py-8 space-y-3">
            <p className="text-[#555] text-sm">
              Le numéro de suivi est au format <span className="font-mono text-[#A1A1AA]">PMT-AAAAMMJJ-XXXXXX</span>
            </p>
            <p className="text-[#555] text-xs">
              Il se trouve dans votre email de confirmation ou sur votre tableau de bord
            </p>
          </div>
        )}
      </main>

      {/* ── Footer minimal ── */}
      <footer className="py-8 border-t border-white/5 text-center text-[#555] text-xs">
        © {new Date().getFullYear()} Prestige Horizon Inc. · Enregistré CANAFE · Canada ↔ Bénin
      </footer>
    </div>
  );
};

export default TrackTransfer;