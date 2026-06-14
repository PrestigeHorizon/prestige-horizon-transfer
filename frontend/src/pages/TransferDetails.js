import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft, Copy, CheckCircle2, Clock, CheckCircle, AlertCircle,
  Loader2, Upload, FileText, Info, Smartphone, Building2,
  CreditCard, User, Phone, Mail, Landmark, ExternalLink,
} from 'lucide-react';
import mtnLogo from '../images/providers/mtn-momo.png';
import moovLogo from '../images/providers/moov-money.png';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const fmtCAD = (n) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n);
const fmtXOF = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
const fmt    = (n, cur) => cur === 'CAD' ? fmtCAD(n) : fmtXOF(n);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-CA', {
  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

const STATUS_STEPS = ['pending', 'payment_received', 'processing', 'completed'];

const STATUS_META = {
  pending:          { label: 'En attente de paiement', color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/30',  Icon: Clock },
  payment_received: { label: 'Paiement reçu',          color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/30',   Icon: CheckCircle },
  processing:       { label: 'En cours de traitement', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', Icon: Loader2 },
  completed:        { label: 'Complété',               color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/30',  Icon: CheckCircle },
  cancelled:        { label: 'Annulé',                 color: 'text-zinc-400',   bg: 'bg-zinc-400/10',   border: 'border-zinc-400/30',   Icon: AlertCircle },
  failed:           { label: 'Échoué',                 color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/30',    Icon: AlertCircle },
};

const DELIVERY_ASSETS = {
  mtn:           { logo: mtnLogo,  color: '#FFCC00', label: 'MTN Mobile Money' },
  moov:          { logo: moovLogo, color: '#00a51b', label: 'Moov Money' },
  bank_transfer: { logo: null,     color: '#D4AF37', label: 'Virement bancaire', initials: 'VB' },
  interac:       { logo: null,     color: '#D4AF37', label: 'Interac / Bancaire', initials: 'IC' },
};

const PAYMENT_ICONS = { interac: Building2, crypto_usdc: CreditCard, bank_transfer: Landmark };

/* ── Copy button ── */
const CopyBtn = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copié !');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1 text-xs text-[#A1A1AA] hover:text-[#D4AF37] transition-colors">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      {label && <span>{label}</span>}
    </button>
  );
};

/* ── Timeline barre de progression ── */
const StatusTimeline = ({ status }) => {
  const isTerminal = ['cancelled', 'failed'].includes(status);
  const currentIdx = STATUS_STEPS.indexOf(status);

  if (isTerminal) {
    const m = STATUS_META[status];
    return (
      <div className={`flex items-center gap-3 p-4 rounded-xl ${m.bg} border ${m.border}`}>
        <m.Icon className={`w-5 h-5 ${m.color} shrink-0`} />
        <div>
          <p className={`font-semibold text-sm ${m.color}`}>{m.label}</p>
          <p className="text-[#A1A1AA] text-xs mt-0.5">
            {status === 'cancelled' ? 'Ce transfert a été annulé.' : 'Une erreur est survenue. Contactez notre support.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {STATUS_STEPS.map((s, i) => {
        const done    = currentIdx > i;
        const active  = currentIdx === i;
        const m       = STATUS_META[s];
        return (
          <div key={s} className="flex items-start gap-4">
            {/* Icône + ligne */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                done   ? 'bg-[#D4AF37] border-[#D4AF37]' :
                active ? `${m.bg} ${m.border}` :
                         'bg-[#1A1A1A] border-white/10'
              }`}>
                {done
                  ? <CheckCircle2 className="w-4 h-4 text-black" />
                  : <m.Icon className={`w-4 h-4 ${active ? m.color : 'text-[#555]'} ${active && s === 'processing' ? 'animate-spin' : ''}`} />
                }
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`w-px h-6 mt-1 ${done ? 'bg-[#D4AF37]/50' : 'bg-white/10'}`} />
              )}
            </div>
            {/* Label */}
            <div className="pt-1.5">
              <p className={`text-sm font-medium ${done ? 'text-[#D4AF37]' : active ? m.color : 'text-[#555]'}`}>
                {m.label}
              </p>
              {active && (
                <p className="text-xs text-[#A1A1AA] mt-0.5">Étape en cours</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Row helper ── */
const Row = ({ label, value, bold, gold, mono }) => (
  <div className={`flex justify-between items-start gap-4 ${bold ? 'font-semibold' : 'text-sm'}`}>
    <span className="text-[#A1A1AA] shrink-0">{label}</span>
    <span className={`text-right ${gold ? 'text-[#D4AF37] font-bold' : 'text-white'} ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

/* ════════════════════════════════════════════════════ */
const TransferDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [transfer,       setTransfer]       = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [proofFile,      setProofFile]      = useState(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUploaded,  setProofUploaded]  = useState(false);

  const fetchTransfer = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/api/transfers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransfer(data);
      if (data.payment_proof_filename) setProofUploaded(true);
    } catch {
      toast.error('Transfert introuvable');
      navigate('/transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransfer(); }, [id]);

  const handleProofUpload = async () => {
    if (!proofFile) return;
    setProofUploading(true);
    try {
      const token = sessionStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', proofFile);
      await axios.post(`${API_URL}/api/transfers/${id}/proof`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setProofUploaded(true);
      toast.success('Preuve envoyée ! Notre équipe va valider votre paiement.');
      fetchTransfer();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setProofUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Navbar />
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
        </div>
      </div>
    );
  }

  if (!transfer) return null;

  const meta     = STATUS_META[transfer.status] || STATUS_META.pending;
  const delivery = DELIVERY_ASSETS[transfer.delivery_method] || {};
  const PayIcon  = PAYMENT_ICONS[transfer.payment_method] || Building2;
  const showProofUpload = transfer.status === 'pending' && !proofUploaded;

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="transfer-details-page">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">

        {/* Back */}
        <Link to="/transfers" className="inline-flex items-center gap-2 text-[#A1A1AA] hover:text-white transition-colors mb-6 text-sm" data-testid="back-to-transfers">
          <ArrowLeft className="w-4 h-4" /> Retour à l&apos;historique
        </Link>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center`}>
              <meta.Icon className={`w-6 h-6 ${meta.color} ${transfer.status === 'processing' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {transfer.corridor === 'canada_to_benin' ? '🇨🇦 → 🇧🇯' : '🇧🇯 → 🇨🇦'}&nbsp;
                {fmt(transfer.send_amount, transfer.send_currency)}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[#A1A1AA] text-sm font-mono">{transfer.tracking_number}</p>
                <CopyBtn text={transfer.tracking_number} />
              </div>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${meta.color} ${meta.bg} border ${meta.border}`} data-testid="transfer-status">
            <meta.Icon className={`w-4 h-4 ${transfer.status === 'processing' ? 'animate-spin' : ''}`} />
            {meta.label}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Colonne gauche (2/3) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Timeline */}
            <Card className="bg-[#0F0F0F] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base">Progression du transfert</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <StatusTimeline status={transfer.status} />
              </CardContent>
            </Card>

            {/* Instructions de paiement */}
            {transfer.payment_instructions && transfer.status === 'pending' && (
              <Card className="bg-[#0F0F0F] border-[#D4AF37]/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#D4AF37]" />
                    {transfer.payment_instructions.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="space-y-3">
                    {transfer.payment_instructions.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 flex items-start justify-between gap-2">
                          <span className="text-[#A1A1AA] text-sm leading-relaxed">{step}</span>
                          {(step.includes('PMT-') || step.includes('@') || step.includes('0x') || step.includes('BJ66')) && (
                            <CopyBtn text={step.split(':').pop()?.trim() || step} />
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {transfer.payment_instructions.note && (
                    <div className="mt-4 p-3 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/20 flex gap-2">
                      <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                      <p className="text-[#A1A1AA] text-xs leading-relaxed">{transfer.payment_instructions.note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upload preuve */}
            {showProofUpload && (
              <Card className="bg-[#0F0F0F] border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Upload className="w-5 h-5 text-[#D4AF37]" />
                    Téléverser votre preuve de paiement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[#A1A1AA] text-sm">
                    Une fois le paiement effectué, envoyez votre capture d&apos;écran ou reçu (JPG, PNG, PDF — max 5 Mo).
                  </p>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      proofFile ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-white/10 hover:border-[#D4AF37]/30 hover:bg-white/5'
                    }`}
                  >
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                    {proofFile ? (
                      <div className="space-y-1">
                        <Smartphone className="w-8 h-8 text-[#D4AF37] mx-auto" />
                        <p className="text-white text-sm font-medium">{proofFile.name}</p>
                        <p className="text-[#A1A1AA] text-xs">{(proofFile.size / 1024).toFixed(0)} Ko · cliquez pour changer</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-[#555] mx-auto" />
                        <p className="text-[#A1A1AA] text-sm">Cliquez pour sélectionner</p>
                        <p className="text-[#555] text-xs">JPG, PNG, WebP, PDF · Max 5 Mo</p>
                      </div>
                    )}
                  </div>
                  <Button onClick={handleProofUpload} disabled={!proofFile || proofUploading}
                    className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold">
                    {proofUploading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi en cours…</>
                      : <><Upload className="w-4 h-4 mr-2" />Envoyer la preuve de paiement</>}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Preuve déjà envoyée */}
            {proofUploaded && transfer.status === 'pending' && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
                <div>
                  <p className="text-green-400 font-semibold text-sm">Preuve de paiement reçue</p>
                  <p className="text-[#A1A1AA] text-xs mt-0.5">Notre équipe va valider et traiter votre transfert sous peu.</p>
                </div>
              </div>
            )}

            {/* Notes admin */}
            {transfer.admin_notes && (
              <div className="p-4 bg-[#1A1A1A] rounded-xl border border-white/10">
                <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-1">Note de notre équipe</p>
                <p className="text-white text-sm">{transfer.admin_notes}</p>
              </div>
            )}

            {/* Montants */}
            <Card className="bg-[#0A0A0A] border-[#D4AF37]/20" data-testid="amount-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base">Détail des montants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="Montant envoyé"   value={fmt(transfer.send_amount, transfer.send_currency)} />
                <Row label="Frais de service" value={fmt(transfer.fee, transfer.send_currency)} />
                <div className="h-px bg-white/10" />
                <Row label="Total payé"       value={fmt(transfer.total_charged, transfer.send_currency)} bold />
                <div className="h-px bg-white/10" />
                <Row label="Le receveur reçoit" value={fmt(transfer.receive_amount, transfer.receive_currency)} gold />
                <Row label="Taux appliqué" value={`1 ${transfer.send_currency} = ${transfer.exchange_rate} ${transfer.receive_currency}`} />
              </CardContent>
            </Card>
          </div>

          {/* ── Colonne droite (1/3) ── */}
          <div className="space-y-6">

            {/* Méthodes */}
            <Card className="bg-[#0F0F0F] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Méthodes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-[#A1A1AA] text-xs mb-1.5">Paiement (vous)</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                      <PayIcon className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <span className="text-white text-sm font-medium">
                      {transfer.payment_method === 'interac' && 'Interac / Virement'}
                      {transfer.payment_method === 'crypto_usdc' && 'Crypto USDC'}
                      {transfer.payment_method === 'bank_transfer' && 'Virement bancaire'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs mb-1.5">Réception</p>
                  <div className="flex items-center gap-2">
                    {delivery.logo ? (
                      <img src={delivery.logo} alt={delivery.label} className="h-6 w-auto object-contain" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ background: `${delivery.color}20`, color: delivery.color }}>
                        {delivery.initials}
                      </div>
                    )}
                    <span className="text-white text-sm font-medium">{delivery.label}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receveur */}
            <Card className="bg-[#0F0F0F] border-white/10" data-testid="receiver-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Receveur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                  <span className="text-white text-sm">{transfer.receiver_name}</span>
                </div>
                {transfer.receiver_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                    <span className="text-white text-sm font-mono">{transfer.receiver_phone}</span>
                  </div>
                )}
                {transfer.receiver_interac_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                    <span className="text-white text-sm">{transfer.receiver_interac_email}</span>
                  </div>
                )}
                {transfer.receiver_bank_name && (
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                    <div>
                      <p className="text-white text-sm">{transfer.receiver_bank_name}</p>
                      {transfer.receiver_bank_account && (
                        <p className="text-[#A1A1AA] text-xs font-mono">{transfer.receiver_bank_account}</p>
                      )}
                    </div>
                  </div>
                )}
                {transfer.notes && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[#A1A1AA] text-xs mb-1">Notes</p>
                    <p className="text-white text-sm">{transfer.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expéditeur */}
            <Card className="bg-[#0F0F0F] border-white/10" data-testid="sender-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Expéditeur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                  <span className="text-white text-sm">{transfer.sender_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                  <span className="text-white text-sm font-mono">{transfer.sender_phone}</span>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card className="bg-[#0F0F0F] border-white/10" data-testid="info-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-[#A1A1AA] text-xs">Créé le</p>
                  <p className="text-white">{fmtDate(transfer.created_at)}</p>
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs">Dernière mise à jour</p>
                  <p className="text-white">{fmtDate(transfer.updated_at)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Suivi public */}
            <a
              href={`/track/${transfer.tracking_number}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/10 text-[#A1A1AA] hover:text-white hover:border-white/20 transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Page de suivi public
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TransferDetails;