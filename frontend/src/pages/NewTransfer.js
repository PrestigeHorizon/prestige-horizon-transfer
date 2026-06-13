import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowRight, Check, Loader2, ArrowLeft, CreditCard,
  Building2, ChevronRight, Info, Upload, Copy, CheckCircle2,
  FileText, Smartphone, ExternalLink,
} from 'lucide-react';
import mtnLogo from '../images/providers/mtn-momo.png';
import moovLogo from '../images/providers/moov-money.png';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/* ─── Helpers ─── */
const DELIVERY_ASSETS = {
  mtn:           { logo: mtnLogo,  color: '#FFCC00', label: 'MTN Mobile Money' },
  moov:          { logo: moovLogo, color: '#00a51b', label: 'Moov Money' },
  bank_transfer: { logo: null,     color: '#D4AF37', label: 'Virement bancaire', initials: 'VB' },
  interac:       { logo: null,     color: '#D4AF37', label: 'Interac / Bancaire', initials: 'IC' },
};
const PAYMENT_ICONS = { interac: Building2, crypto_usdc: CreditCard, bank_transfer: Building2 };

const fmtCAD = (n) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n);
const fmtXOF = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
const fmt    = (amount, currency) => currency === 'CAD' ? fmtCAD(amount) : fmtXOF(amount);

const STEP_LABELS = ['Direction & paiement', 'Receveur', 'Confirmation', 'Paiement'];

/* ─── Step bar ─── */
const StepBar = ({ step }) => (
  <div className="flex items-start gap-0 mb-10">
    {STEP_LABELS.map((label, i) => {
      const s = i + 1;
      const done   = step > s;
      const active = step === s;
      return (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
              done   ? 'bg-[#D4AF37] text-black' :
              active ? 'bg-[#D4AF37]/20 border-2 border-[#D4AF37] text-[#D4AF37]' :
                       'bg-[#1A1A1A] text-[#555]'
            }`}>
              {done ? <Check className="w-4 h-4" /> : s}
            </div>
            <span className={`text-xs text-center leading-tight max-w-[72px] ${active ? 'text-[#D4AF37]' : 'text-[#555]'}`}>
              {label}
            </span>
          </div>
          {s < STEP_LABELS.length && (
            <div className={`flex-1 h-px mx-2 mt-[-14px] ${step > s ? 'bg-[#D4AF37]' : 'bg-[#1A1A1A]'}`} />
          )}
        </div>
      );
    })}
  </div>
);

/* ─── Selectable card ─── */
const SelectCard = ({ selected, onClick, color = '#D4AF37', children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
      selected ? 'bg-white/5' : 'border-white/10 bg-transparent hover:border-white/20 hover:bg-white/5'
    }`}
    style={{
      borderColor: selected ? color : undefined,
      boxShadow:   selected ? `0 0 16px ${color}25` : undefined,
    }}
  >
    {children}
  </button>
);

/* ─── Summary row ─── */
const Row = ({ label, value, bold, gold }) => (
  <div className={`flex justify-between ${bold ? 'font-semibold text-base' : 'text-sm'}`}>
    <span className="text-[#A1A1AA]">{label}</span>
    <span className={gold ? 'text-[#D4AF37] font-bold' : 'text-white'}>{value}</span>
  </div>
);

/* ─── Copy button ─── */
const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="ml-2 p-1 rounded text-[#A1A1AA] hover:text-[#D4AF37] transition-colors shrink-0" title="Copier">
      {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
};

/* ════════════════════════════════════════════════════ */
const NewTransfer = () => {
  const navigate = useNavigate();

  const [step,       setStep]       = useState(1);
  const [corridors,  setCorridors]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [calcLoading,setCalcLoading]= useState(false);
  const [calculation,setCalculation]= useState(null);
  const [created,    setCreated]    = useState(null);   // transfer doc après POST

  /* upload proof state */
  const [proofFile,    setProofFile]    = useState(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUploaded,  setProofUploaded]  = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    corridor: '', payment_method: '', delivery_method: '',
    send_amount: '',
    receiver_name: '', receiver_phone: '', receiver_mobile_network: '',
    receiver_bank_name: '', receiver_bank_account: '', receiver_bank_iban: '',
    receiver_interac_email: '',
    notes: '',
  });

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: typeof e === 'string' ? e : e.target.value }));

  useEffect(() => {
    axios.get(`${API_URL}/api/corridors`)
      .then((r) => setCorridors(r.data))
      .catch(() => toast.error('Impossible de charger les corridors'));
  }, []);

  const calculate = useCallback(async () => {
    if (!form.corridor || !form.send_amount || parseFloat(form.send_amount) <= 0) {
      setCalculation(null); return;
    }
    setCalcLoading(true);
    try {
      const { data } = await axios.get(
        `${API_URL}/api/corridors/${form.corridor}/calculate?send_amount=${form.send_amount}`
      );
      setCalculation(data);
    } catch { setCalculation(null); }
    finally { setCalcLoading(false); }
  }, [form.corridor, form.send_amount]);

  useEffect(() => { calculate(); }, [calculate]);

  const selectedCorridor = corridors.find((c) => c.key === form.corridor);
  const needsPhone   = ['mtn', 'moov'].includes(form.delivery_method);
  const needsBank    = form.delivery_method === 'bank_transfer';
  const needsInterac = form.delivery_method === 'interac';

  const okStep1 = form.corridor && form.payment_method && form.send_amount &&
    parseFloat(form.send_amount) > 0 && !calcLoading;

  const okStep2 = form.delivery_method && form.receiver_name &&
    (!needsPhone   || form.receiver_phone) &&
    (!needsBank    || (form.receiver_bank_name && form.receiver_bank_account)) &&
    (!needsInterac || form.receiver_interac_email);

  /* ── Submit (step 3 → 4) ── */
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        corridor:                form.corridor,
        payment_method:          form.payment_method,
        delivery_method:         form.delivery_method,
        send_amount:             parseFloat(form.send_amount),
        receiver_name:           form.receiver_name,
        receiver_phone:          form.receiver_phone || undefined,
        receiver_mobile_network: form.receiver_mobile_network || undefined,
        receiver_bank_name:      form.receiver_bank_name || undefined,
        receiver_bank_account:   form.receiver_bank_account || undefined,
        receiver_bank_iban:      form.receiver_bank_iban || undefined,
        receiver_interac_email:  form.receiver_interac_email || undefined,
        notes:                   form.notes || undefined,
      };
      const { data } = await axios.post(`${API_URL}/api/transfers`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreated(data);
      setStep(4);
      toast.success('Transfert créé ! Suivez les instructions de paiement.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  /* ── Upload proof ── */
  const handleProofUpload = async () => {
    if (!proofFile || !created) return;
    setProofUploading(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', proofFile);
      await axios.post(`${API_URL}/api/transfers/${created.id}/proof`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setProofUploaded(true);
      toast.success('Preuve envoyée ! Notre équipe va valider votre paiement.');
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'envoi de la preuve");
    } finally {
      setProofUploading(false);
    }
  };

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div className="min-h-screen bg-[#050505]" data-testid="new-transfer-page">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Nouveau transfert</h1>
          <p className="text-[#A1A1AA] mt-1">Canada ↔ Bénin — rapide, sécurisé, validé manuellement</p>
        </div>

        <StepBar step={step} />

        {/* ─────────────── STEP 1 : Corridor + paiement + montant ─────────────── */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-3">
              <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider">Direction du transfert</Label>
              <div className="grid gap-3">
                {corridors.map((c) => (
                  <SelectCard
                    key={c.key}
                    selected={form.corridor === c.key}
                    onClick={() => setForm((p) => ({ ...p, corridor: c.key, payment_method: '', delivery_method: '' }))}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-semibold text-base">{c.label}</div>
                        <div className="text-[#A1A1AA] text-sm mt-0.5">
                          {c.from_currency} → {c.to_currency} · {c.estimated_time}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#D4AF37] text-sm font-medium">
                          {c.from_currency === 'CAD'
                            ? `${c.exchange_rate?.toFixed(0)} XOF/CAD`
                            : `${c.exchange_rate?.toFixed(5)} CAD/XOF`}
                        </span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${form.corridor === c.key ? 'text-[#D4AF37] rotate-90' : 'text-[#555]'}`} />
                      </div>
                    </div>
                  </SelectCard>
                ))}
              </div>
            </div>

            {selectedCorridor && (
              <div className="space-y-3">
                <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider">Méthode de paiement (vous)</Label>
                <div className="grid gap-3">
                  {selectedCorridor.payment_methods.map((pm) => {
                    const Icon = PAYMENT_ICONS[pm.key] || CreditCard;
                    return (
                      <SelectCard key={pm.key} selected={form.payment_method === pm.key} onClick={() => set('payment_method')(pm.key)}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-[#D4AF37]" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{pm.label}</div>
                            <div className="text-[#A1A1AA] text-xs">{pm.currency}</div>
                          </div>
                          {form.payment_method === pm.key && <Check className="w-4 h-4 text-[#D4AF37] ml-auto" />}
                        </div>
                      </SelectCard>
                    );
                  })}
                </div>
              </div>
            )}

            {form.payment_method && (
              <div className="space-y-3">
                <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider">
                  Montant à envoyer ({selectedCorridor?.from_currency})
                </Label>
                <Input
                  type="number"
                  placeholder={selectedCorridor?.from_currency === 'CAD' ? '200' : '50000'}
                  value={form.send_amount}
                  onChange={set('send_amount')}
                  className="bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white text-2xl font-bold h-16 text-center"
                  min={selectedCorridor?.min_amount}
                  max={selectedCorridor?.max_amount}
                  data-testid="amount-input"
                />
                {selectedCorridor && (
                  <p className="text-[#A1A1AA] text-xs flex items-center gap-1 justify-center">
                    <Info className="w-3 h-3" />
                    Min {fmt(selectedCorridor.min_amount, selectedCorridor.from_currency)} ·
                    Max {fmt(selectedCorridor.max_amount, selectedCorridor.from_currency)}
                  </p>
                )}
              </div>
            )}

            {calcLoading && (
              <div className="flex items-center justify-center py-4 gap-2 text-[#A1A1AA]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Calcul en cours…</span>
              </div>
            )}

            {calculation && !calcLoading && (
              <Card className="bg-[#0A0A0A] border-[#D4AF37]/20">
                <CardContent className="p-5 space-y-3">
                  <Row label="Montant envoyé"   value={fmt(form.send_amount, calculation.send_currency)} />
                  <Row label="Frais de service" value={fmt(calculation.fee, calculation.send_currency)} />
                  <div className="h-px bg-white/10" />
                  <Row label="Total à payer"    value={fmt(calculation.total_charged, calculation.send_currency)} bold />
                  <div className="h-px bg-white/10" />
                  <Row label="Le receveur reçoit" value={fmt(calculation.receive_amount, calculation.receive_currency)} gold />
                  <Row label="Taux appliqué" value={`1 ${calculation.send_currency} = ${calculation.exchange_rate} ${calculation.receive_currency}`} />
                </CardContent>
              </Card>
            )}

            <Button
              onClick={() => setStep(2)}
              disabled={!okStep1}
              className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold py-6"
              data-testid="step-1-next"
            >
              Continuer — Infos du receveur
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* ─────────────── STEP 2 : Receveur ─────────────── */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in" data-testid="step-2">
            <div className="space-y-3">
              <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider">Mode de réception (receveur)</Label>
              <div className="grid gap-3">
                {selectedCorridor?.delivery_methods?.map((dm) => {
                  const asset = DELIVERY_ASSETS[dm.key] || {};
                  return (
                    <SelectCard
                      key={dm.key}
                      selected={form.delivery_method === dm.key}
                      color={asset.color}
                      onClick={() => setForm((p) => ({
                        ...p,
                        delivery_method: dm.key,
                        receiver_mobile_network: ['mtn', 'moov'].includes(dm.key) ? dm.key : '',
                      }))}
                    >
                      <div className="flex items-center gap-3">
                        {asset.logo ? (
                          <img src={asset.logo} alt={asset.label} className="h-8 w-auto object-contain" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${asset.color}20`, color: asset.color }}>
                            {asset.initials}
                          </div>
                        )}
                        <div>
                          <div className="text-white font-medium">{asset.label || dm.label}</div>
                          <div className="text-[#A1A1AA] text-xs">
                            {['mtn', 'moov'].includes(dm.key) ? 'Numéro Mobile Money' : 'Coordonnées bancaires / email'}
                          </div>
                        </div>
                        {form.delivery_method === dm.key && <Check className="w-4 h-4 text-[#D4AF37] ml-auto" />}
                      </div>
                    </SelectCard>
                  );
                })}
              </div>
            </div>

            <Card className="bg-[#0F0F0F] border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-base">Informations du receveur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[#A1A1AA] text-sm">Nom complet *</Label>
                  <Input placeholder="Prénom Nom du receveur" value={form.receiver_name} onChange={set('receiver_name')}
                    className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" data-testid="receiver-name" />
                </div>

                {needsPhone && (
                  <div>
                    <Label className="text-[#A1A1AA] text-sm">
                      Numéro {form.delivery_method === 'mtn' ? 'MTN' : 'Moov'} Mobile Money *
                    </Label>
                    <Input placeholder="+229 01 XX XX XX XX" value={form.receiver_phone} onChange={set('receiver_phone')}
                      type="tel" className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" data-testid="receiver-phone" />
                    <p className="text-[#555] text-xs mt-1">Format international (+229 pour Bénin)</p>
                  </div>
                )}

                {needsBank && (
                  <>
                    <div>
                      <Label className="text-[#A1A1AA] text-sm">Nom de la banque *</Label>
                      <Input placeholder="Ex : Banque of Africa, Ecobank…" value={form.receiver_bank_name} onChange={set('receiver_bank_name')}
                        className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" />
                    </div>
                    <div>
                      <Label className="text-[#A1A1AA] text-sm">Numéro de compte *</Label>
                      <Input placeholder="Numéro de compte bancaire" value={form.receiver_bank_account} onChange={set('receiver_bank_account')}
                        className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" />
                    </div>
                    <div>
                      <Label className="text-[#A1A1AA] text-sm">IBAN / Code SWIFT (optionnel)</Label>
                      <Input placeholder="BJ66 BJ00…" value={form.receiver_bank_iban} onChange={set('receiver_bank_iban')}
                        className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" />
                    </div>
                  </>
                )}

                {needsInterac && (
                  <div>
                    <Label className="text-[#A1A1AA] text-sm">Email Interac du receveur *</Label>
                    <Input placeholder="email@exemple.ca" type="email" value={form.receiver_interac_email} onChange={set('receiver_interac_email')}
                      className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" />
                  </div>
                )}

                <div>
                  <Label className="text-[#A1A1AA] text-sm">Notes (optionnel)</Label>
                  <Textarea placeholder="Message pour notre équipe ou précisions…" value={form.notes} onChange={set('notes')}
                    className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white resize-none" rows={3} data-testid="notes" />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="border-white/10 text-white hover:bg-white/5" data-testid="step-2-back">
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour
              </Button>
              <Button onClick={() => setStep(3)} disabled={!okStep2} className="flex-1 bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold" data-testid="step-2-next">
                Vérifier le récapitulatif <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ─────────────── STEP 3 : Récapitulatif ─────────────── */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <Card className="bg-[#0F0F0F] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base">Récapitulatif du transfert</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="Corridor"          value={selectedCorridor?.label} />
                <Row label="Méthode de paiement" value={selectedCorridor?.payment_methods?.find((p) => p.key === form.payment_method)?.label} />
                <Row label="Mode de réception" value={DELIVERY_ASSETS[form.delivery_method]?.label} />
              </CardContent>
            </Card>

            {calculation && (
              <Card className="bg-[#0A0A0A] border-[#D4AF37]/20">
                <CardContent className="p-5 space-y-3">
                  <Row label="Vous envoyez"       value={fmt(form.send_amount, calculation.send_currency)} />
                  <Row label="Frais"              value={fmt(calculation.fee, calculation.send_currency)} />
                  <div className="h-px bg-white/10" />
                  <Row label="Total à payer"      value={fmt(calculation.total_charged, calculation.send_currency)} bold />
                  <div className="h-px bg-white/10" />
                  <Row label="Le receveur reçoit" value={fmt(calculation.receive_amount, calculation.receive_currency)} gold />
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#0F0F0F] border-white/10">
              <CardContent className="p-5 space-y-3">
                <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-2">Receveur</p>
                <Row label="Nom" value={form.receiver_name} />
                {form.receiver_phone         && <Row label="Téléphone"    value={form.receiver_phone} />}
                {form.receiver_bank_name     && <Row label="Banque"       value={form.receiver_bank_name} />}
                {form.receiver_bank_account  && <Row label="N° compte"    value={form.receiver_bank_account} />}
                {form.receiver_interac_email && <Row label="Email Interac" value={form.receiver_interac_email} />}
                {form.notes                  && <Row label="Notes"        value={form.notes} />}
              </CardContent>
            </Card>

            <div className="glass-card rounded-xl p-4 border-[#D4AF37]/20 flex items-start gap-3">
              <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <p className="text-[#A1A1AA] text-sm leading-relaxed">
                Après confirmation, vous recevrez les instructions de paiement détaillées et un numéro de suivi unique.
                Aucun argent ne sera débité automatiquement.
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(2)} className="border-white/10 text-white hover:bg-white/5" data-testid="step-3-back">
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold py-6" data-testid="submit-transfer">
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Création en cours…</>
                ) : (
                  <><Check className="w-5 h-5 mr-2" />Confirmer le transfert</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ─────────────── STEP 4 : Instructions de paiement + upload ─────────────── */}
        {step === 4 && created && (
          <div className="space-y-6 animate-fade-in">

            {/* Succès + tracking */}
            <div className="glass-card rounded-2xl p-6 border-[#D4AF37]/30 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <h2 className="text-white text-xl font-bold">Transfert créé avec succès !</h2>
              <p className="text-[#A1A1AA] text-sm">Votre numéro de suivi :</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-[#D4AF37] font-mono text-lg font-bold tracking-wider bg-[#D4AF37]/10 px-4 py-2 rounded-lg">
                  {created.tracking_number}
                </code>
                <CopyBtn text={created.tracking_number} />
              </div>
              <p className="text-[#555] text-xs">Conservez ce numéro pour suivre votre transfert</p>
            </div>

            {/* Instructions de paiement */}
            {created.payment_instructions && (
              <Card className="bg-[#0F0F0F] border-[#D4AF37]/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#D4AF37]" />
                    {created.payment_instructions.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="space-y-3">
                    {created.payment_instructions.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 flex items-start gap-1">
                          <span className="text-[#A1A1AA] text-sm leading-relaxed flex-1">{step}</span>
                          {/* bouton copier sur les lignes contenant des valeurs clés */}
                          {(step.includes('PMT-') || step.includes('@') || step.includes('0x') || step.includes('BJ66')) && (
                            <CopyBtn text={step.split(':').pop()?.trim() || step} />
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {created.payment_instructions.note && (
                    <div className="mt-4 p-3 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/20 flex gap-2">
                      <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                      <p className="text-[#A1A1AA] text-xs leading-relaxed">{created.payment_instructions.note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upload preuve */}
            <Card className="bg-[#0F0F0F] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#D4AF37]" />
                  Téléverser votre preuve de paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {proofUploaded ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
                    <div>
                      <p className="text-green-400 font-semibold text-sm">Preuve envoyée avec succès !</p>
                      <p className="text-[#A1A1AA] text-xs mt-0.5">Notre équipe va valider votre paiement et traiter votre transfert.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[#A1A1AA] text-sm">
                      Une fois le paiement effectué, uploadez votre capture d&apos;écran ou reçu (JPG, PNG, PDF — max 5 Mo).
                    </p>

                    {/* Drop zone */}
                    <div
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        proofFile ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-white/10 hover:border-[#D4AF37]/30 hover:bg-white/5'
                      }`}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                      {proofFile ? (
                        <div className="space-y-1">
                          <Smartphone className="w-8 h-8 text-[#D4AF37] mx-auto" />
                          <p className="text-white text-sm font-medium">{proofFile.name}</p>
                          <p className="text-[#A1A1AA] text-xs">{(proofFile.size / 1024).toFixed(0)} Ko — cliquez pour changer</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 text-[#555] mx-auto" />
                          <p className="text-[#A1A1AA] text-sm">Cliquez pour sélectionner votre fichier</p>
                          <p className="text-[#555] text-xs">JPG, PNG, WebP, PDF · Max 5 Mo</p>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleProofUpload}
                      disabled={!proofFile || proofUploading}
                      className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold"
                    >
                      {proofUploading
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi en cours…</>
                        : <><Upload className="w-4 h-4 mr-2" />Envoyer la preuve de paiement</>}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(`/transfers/${created.id}`)}
                className="flex-1 border-white/10 text-white hover:bg-white/5"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir le détail du transfert
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1 border-white/10 text-white hover:bg-white/5"
              >
                Retour au tableau de bord
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NewTransfer;