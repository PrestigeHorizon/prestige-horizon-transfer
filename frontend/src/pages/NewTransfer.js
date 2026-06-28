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
  FileText, Smartphone, Languages, Home
} from 'lucide-react';
import mtnLogo from '../images/providers/mtn-momo.png';
import moovLogo from '../images/providers/moov-money.png';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/* ─── Dictionnaire des langues ─── */
const DICTIONARY = {
  fr: {
    title: 'Nouveau transfert',
    subtitle: 'Canada ↔ Bénin — rapide, sécurisé, validé manuellement',
    steps: ['Direction & paiement', 'Receveur', 'Confirmation', 'Paiement'],
    direction: 'Direction du transfert',
    paymentMethod: 'Méthode de paiement (vous)',
    amountToSend: 'Montant à envoyer',
    minMax: 'Min {min} · Max {max}',
    calculating: 'Calcul en cours…',
    sentAmount: 'Montant envoyé',
    fees: 'Frais de service',
    totalPay: 'Total à payer',
    receiverGets: 'Le receveur reçoit',
    rate: 'Taux appliqué',
    nextReceiver: 'Continuer — Infos du receveur',
    back: 'Retour',
    nextSummary: 'Vérifier le récapitulatif',
    deliveryMethod: 'Mode de réception (receveur)',
    mobileNum: 'Numéro Mobile Money',
    bankCoords: 'Coordonnées bancaires / email',
    receiverInfos: 'Informations du receveur',
    fullName: 'Nom complet *',
    phoneLabel: 'Numéro {provider} Mobile Money *',
    intlFormat: 'Format international (+229 pour Bénin)',
    bankName: 'Nom de la banque *',
    accountNum: 'Numéro de compte *',
    ibanSwift: 'IBAN / Code SWIFT (optionnel)',
    interacEmail: 'Email Interac du receveur *',
    notes: 'Notes (optionnel)',
    notesPlaceholder: 'Message pour notre équipe ou précisions…',
    summaryTitle: 'Récapitulatif du transfert',
    receiverText: 'Receveur',
    disclaimer: 'Après confirmation, vous recevrez les instructions de paiement détaillées et un numéro de suivi unique. Aucun argent ne sera débité automatiquement.',
    creating: 'Création en cours…',
    confirmTransfer: 'Confirmer le transfert',
    successTitle: 'Transfert créé avec succès !',
    trackingLabel: 'Votre numéro de suivi :',
    trackingNote: 'Conservez ce numéro pour suivre votre transfert',
    uploadTitle: 'Téléverser votre preuve de paiement',
    uploadSuccess: 'Preuve envoyée avec succès !',
    uploadSuccessSub: 'Notre équipe va valider votre paiement et traiter votre transfert.',
    uploadInstructions: "Une fois le paiement effectué, uploadez votre capture d'écran ou reçu (JPG, PNG, PDF — max 5 Mo).",
    clickToSelect: 'Cliquez pour sélectionner votre fichier',
    clickToChange: 'cliquez pour changer',
    sending: 'Envoi en cours…',
    sendProof: 'Envoyer la preuve',
    errorCorridors: 'Impossible de charger les corridors',
    successCreated: 'Transfert créé ! Suivez les instructions de paiement.',
    errorCreation: 'Erreur lors de la création',
    successProof: 'Preuve envoyée ! Notre équipe va valider votre paiement.',
    errorProof: "Erreur lors de l'envoi de la preuve",
    finishLater: 'Retourner à l’accueil / Ajouter la preuve plus tard'
  },
  en: {
    title: 'New Transfer',
    subtitle: 'Canada ↔ Benin — fast, secure, manually verified',
    steps: ['Direction & Payment', 'Receiver', 'Confirmation', 'Payment'],
    direction: 'Transfer Direction',
    paymentMethod: 'Payment Method (You)',
    amountToSend: 'Amount to send',
    minMax: 'Min {min} · Max {max}',
    calculating: 'Calculating…',
    sentAmount: 'Amount sent',
    fees: 'Service fees',
    totalPay: 'Total to pay',
    receiverGets: 'Receiver gets',
    rate: 'Applied rate',
    nextReceiver: 'Continue — Receiver details',
    back: 'Back',
    nextSummary: 'Review summary',
    deliveryMethod: 'Delivery Method (Receiver)',
    mobileNum: 'Mobile Money Number',
    bankCoords: 'Bank details / email',
    receiverInfos: 'Receiver Information',
    fullName: 'Full Name *',
    phoneLabel: '{provider} Mobile Money Number *',
    intlFormat: 'International format (+229 for Benin)',
    bankName: 'Bank Name *',
    accountNum: 'Account Number *',
    ibanSwift: 'IBAN / SWIFT Code (optional)',
    interacEmail: "Receiver's Interac Email *",
    notes: 'Notes (optional)',
    notesPlaceholder: 'Message for our team or specifications…',
    summaryTitle: 'Transfer Summary',
    receiverText: 'Receiver',
    disclaimer: 'After confirmation, you will receive detailed payment instructions and a unique tracking number. No money will be automatically debited.',
    creating: 'Creating…',
    confirmTransfer: 'Confirm transfer',
    successTitle: 'Transfer successfully created!',
    trackingLabel: 'Your tracking number:',
    trackingNote: 'Keep this number to track your transfer',
    uploadTitle: 'Upload your proof of payment',
    uploadSuccess: 'Proof successfully sent!',
    uploadSuccessSub: 'Our team will validate your payment and process your transfer.',
    uploadInstructions: 'Once payment is made, upload your screenshot or receipt (JPG, PNG, PDF — max 5 MB).',
    clickToSelect: 'Click to select your file',
    clickToChange: 'click to change',
    sending: 'Sending…',
    sendProof: 'Send proof',
    errorCorridors: 'Unable to load corridors',
    successCreated: 'Transfer created! Follow the payment instructions.',
    errorCreation: 'Error during creation',
    successProof: 'Proof sent! Our team will validate your payment.',
    errorProof: 'Error while sending proof',
    finishLater: 'Back to Home / Add proof later'
  }
};

/* ─── Helpers ─── */
const DELIVERY_ASSETS = {
  mtn: { logo: mtnLogo, color: '#FFCC00', label: 'MTN Mobile Money' },
  moov: { logo: moovLogo, color: '#00a51b', label: 'Moov Money' },
  bank_transfer: { logo: null, color: '#D4AF37', label: 'Virement bancaire / Bank transfer', initials: 'VB' },
  interac: { logo: null, color: '#D4AF37', label: 'Interac / Bancaire', initials: 'IC' },
};
const PAYMENT_ICONS = { interac: Building2, crypto_usdc: CreditCard, bank_transfer: Building2 };

const fmtCAD = (n) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n);
const fmtXOF = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);
const fmt = (amount, currency) => currency === 'CAD' ? fmtCAD(amount) : fmtXOF(amount);

/* ─── Step bar ─── */
const StepBar = ({ step, t }) => (
  <div className="flex items-start gap-0 mb-10">
    {t.steps.map((label, i) => {
      const s = i + 1;
      const done = step > s;
      const active = step === s;
      return (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${done ? 'bg-[#D4AF37] text-black' :
                active ? 'bg-[#D4AF37]/20 border-2 border-[#D4AF37] text-[#D4AF37]' :
                  'bg-[#1A1A1A] text-[#555]'
              }`}>
              {done ? <Check className="w-4 h-4" /> : s}
            </div>
            <span className={`text-xs text-center leading-tight max-w-[72px] ${active ? 'text-[#D4AF37]' : 'text-[#555]'}`}>
              {label}
            </span>
          </div>
          {s < t.steps.length && (
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
    className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${selected ? 'bg-white/5' : 'border-white/10 bg-transparent hover:border-white/20 hover:bg-white/5'
      }`}
    style={{
      borderColor: selected ? color : undefined,
      boxShadow: selected ? `0 0 16px ${color}25` : undefined,
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
export const NewTransfer = ({ onLangChange, initialTransfer = null }) => {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => localStorage.getItem('prestige_lang') || 'fr');

  useEffect(() => {
    document.title = lang === 'fr'
      ? "Nouveau transfert | Prestige Money Transfer"
      : "New Transfer | Prestige Money Transfer";
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('prestige_lang', lang);
    if (onLangChange) onLangChange(lang);
  }, [lang, onLangChange]);

  const t = DICTIONARY[lang];

  // Permet de sauter directement à l'étape 4 si un transfert existant est fourni
  const [step, setStep] = useState(initialTransfer ? 4 : 1);
  const [corridors, setCorridors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calculation, setCalculation] = useState(null);
  const [created, setCreated] = useState(initialTransfer);

  /* upload proof state */
  const [proofFile, setProofFile] = useState(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
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
      .catch(() => toast.error(t.errorCorridors));
  }, [t.errorCorridors]);

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
  const needsPhone = ['mtn', 'moov'].includes(form.delivery_method);
  const needsBank = form.delivery_method === 'bank_transfer';
  const needsInterac = form.delivery_method === 'interac';

  const okStep1 = form.corridor && form.payment_method && form.send_amount &&
    parseFloat(form.send_amount) > 0 && !calcLoading;

  const okStep2 = form.delivery_method && form.receiver_name &&
    (!needsPhone || form.receiver_phone) &&
    (!needsBank || (form.receiver_bank_name && form.receiver_bank_account)) &&
    (!needsInterac || form.receiver_interac_email);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const payload = {
        corridor: form.corridor,
        payment_method: form.payment_method,
        delivery_method: form.delivery_method,
        send_amount: parseFloat(form.send_amount),
        receiver_name: form.receiver_name,
        receiver_phone: form.receiver_phone || undefined,
        receiver_mobile_network: form.receiver_mobile_network || undefined,
        receiver_bank_name: form.receiver_bank_name || undefined,
        receiver_bank_account: form.receiver_bank_account || undefined,
        receiver_bank_iban: form.receiver_bank_iban || undefined,
        receiver_interac_email: form.receiver_interac_email || undefined,
        notes: form.notes || undefined,
      };
      const { data } = await axios.post(`${API_URL}/api/transfers`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreated(data);
      setStep(4);
      toast.success(t.successCreated);
    } catch (err) {
      toast.error(err.response?.data?.detail || t.errorCreation);
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = async () => {
    if (!proofFile || !created) return;
    setProofUploading(true);
    try {
      const token = sessionStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', proofFile);
      await axios.post(`${API_URL}/api/transfers/${created.id}/proof`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setProofUploaded(true);
      toast.success(t.successProof);
    } catch (err) {
      toast.error(err.response?.data?.detail || t.errorProof);
    } finally {
      setProofUploading(false);
    }
  };

  return (
    <div className="newTransfer min-h-screen bg-[#050505]" data-testid="new-transfer-page">
      {/* Synchronisation de la navbar globale */}
      <Navbar lang={lang} setLang={setLang} />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">

        {/* Header avec bouton de langue */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{t.title}</h1>
            <p className="text-[#A1A1AA] mt-1">{t.subtitle}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
            className="self-start sm:self-center border-white/10 text-white hover:bg-white/5 flex items-center gap-2"
          >
            <Languages className="w-4 h-4 text-[#D4AF37]" />
            <span>{lang === 'fr' ? 'English' : 'Français'}</span>
          </Button>
        </div>

        <StepBar step={step} t={t} />

        {/* ─────────────── STEP 1 ─────────────── */}
        {step === 1 && (
          /* ... Pas de changement sur le Step 1 ... */
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-3">
              <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider">{t.direction}</Label>
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
                <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider">{t.paymentMethod}</Label>
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
                  {t.amountToSend} ({selectedCorridor?.from_currency})
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
                    {t.minMax
                      .replace('{min}', fmt(selectedCorridor.min_amount, selectedCorridor.from_currency))
                      .replace('{max}', fmt(selectedCorridor.max_amount, selectedCorridor.from_currency))}
                  </p>
                )}
              </div>
            )}

            {calcLoading && (
              <div className="flex items-center justify-center py-4 gap-2 text-[#A1A1AA]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t.calculating}</span>
              </div>
            )}

            {calculation && !calcLoading && (
              <Card className="bg-[#0A0A0A] border-[#D4AF37]/20">
                <CardContent className="p-5 space-y-3">
                  <Row label={t.sentAmount} value={fmt(form.send_amount, calculation.send_currency)} />
                  <Row label={t.fees} value={fmt(calculation.fee, calculation.send_currency)} />
                  <div className="h-px bg-white/10" />
                  <Row label={t.totalPay} value={fmt(calculation.total_charged, calculation.send_currency)} bold />
                  <div className="h-px bg-white/10" />
                  <Row label={t.receiverGets} value={fmt(calculation.receive_amount, calculation.receive_currency)} gold />
                  <Row label={t.rate} value={`1 ${calculation.send_currency} = ${calculation.exchange_rate} ${calculation.receive_currency}`} />
                </CardContent>
              </Card>
            )}

            <Button
              onClick={() => setStep(2)}
              disabled={!okStep1}
              className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold py-6"
              data-testid="step-1-next"
            >
              {t.nextReceiver}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* ─────────────── STEP 2 ─────────────── */}
        {step === 2 && (
          /* ... Pas de changement sur le Step 2 ... */
          <div className="space-y-6 animate-fade-in" data-testid="step-2">
            <div className="space-y-3">
              <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider">{t.deliveryMethod}</Label>
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
                          <img src={asset.logo} alt={asset.label || dm.label} className="h-8 w-auto object-contain" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${asset.color}20`, color: asset.color }}>
                            {asset.initials}
                          </div>
                        )}
                        <div>
                          <div className="text-white font-medium">{lang === 'fr' ? (asset.label || dm.label) : (dm.label || asset.label)}</div>
                          <div className="text-[#A1A1AA] text-xs">
                            {['mtn', 'moov'].includes(dm.key) ? t.mobileNum : t.bankCoords}
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
                <CardTitle className="text-white text-base">{t.receiverInfos}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[#A1A1AA] text-sm">{t.fullName}</Label>
                  <Input placeholder="John Doe" value={form.receiver_name} onChange={set('receiver_name')}
                    className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" data-testid="receiver-name" />
                </div>

                {needsPhone && (
                  <div>
                    <Label className="text-[#A1A1AA] text-sm">
                      {t.phoneLabel.replace('{provider}', form.delivery_method === 'mtn' ? 'MTN' : 'Moov')}
                    </Label>
                    <Input placeholder="+229 01 XX XX XX XX" value={form.receiver_phone} onChange={set('receiver_phone')}
                      type="tel" className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" data-testid="receiver-phone" />
                    <p className="text-[#555] text-xs mt-1">{t.intlFormat}</p>
                  </div>
                )}

                {needsBank && (
                  <>
                    <div>
                      <Label className="text-[#A1A1AA] text-sm">{t.bankName}</Label>
                      <Input placeholder="Ecobank..." value={form.receiver_bank_name} onChange={set('receiver_bank_name')}
                        className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" />
                    </div>
                    <div>
                      <Label className="text-[#A1A1AA] text-sm">{t.accountNum}</Label>
                      <Input value={form.receiver_bank_account} onChange={set('receiver_bank_account')}
                        className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" />
                    </div>
                    <div>
                      <Label className="text-[#A1A1AA] text-sm">{t.ibanSwift}</Label>
                      <Input placeholder="BJ66..." value={form.receiver_bank_iban} onChange={set('receiver_bank_iban')}
                        className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" />
                    </div>
                  </>
                )}

                {needsInterac && (
                  <div>
                    <Label className="text-[#A1A1AA] text-sm">{t.interacEmail}</Label>
                    <Input placeholder="email@exemple.ca" type="email" value={form.receiver_interac_email} onChange={set('receiver_interac_email')}
                      className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white" />
                  </div>
                )}

                <div>
                  <Label className="text-[#A1A1AA] text-sm">{t.notes}</Label>
                  <Textarea placeholder={t.notesPlaceholder} value={form.notes} onChange={set('notes')}
                    className="mt-1.5 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white resize-none" rows={3} data-testid="notes" />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="border-white/10 text-white hover:bg-white/5" data-testid="step-2-back">
                <ArrowLeft className="w-4 h-4 mr-2" /> {t.back}
              </Button>
              <Button onClick={() => setStep(3)} disabled={!okStep2} className="flex-1 bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold" data-testid="step-2-next">
                {t.nextSummary} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ─────────────── STEP 3 ─────────────── */}
        {step === 3 && (
          /* ... Pas de changement sur le Step 3 ... */
          <div className="space-y-5 animate-fade-in">
            <Card className="bg-[#0F0F0F] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base">{t.summaryTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="Corridor" value={selectedCorridor?.label} />
                <Row label={t.paymentMethod} value={selectedCorridor?.payment_methods?.find((p) => p.key === form.payment_method)?.label} />
                <Row label={t.deliveryMethod} value={DELIVERY_ASSETS[form.delivery_method]?.label} />
              </CardContent>
            </Card>

            {calculation && (
              <Card className="bg-[#0A0A0A] border-[#D4AF37]/20">
                <CardContent className="p-5 space-y-3">
                  <Row label={t.sentAmount} value={fmt(form.send_amount, calculation.send_currency)} />
                  <Row label={t.fees} value={fmt(calculation.fee, calculation.send_currency)} />
                  <div className="h-px bg-white/10" />
                  <Row label={t.totalPay} value={fmt(calculation.total_charged, calculation.send_currency)} bold />
                  <div className="h-px bg-white/10" />
                  <Row label={t.receiverGets} value={fmt(calculation.receive_amount, calculation.receive_currency)} gold />
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#0F0F0F] border-white/10">
              <CardContent className="p-5 space-y-3">
                <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-2">{t.receiverText}</p>
                <Row label="Nom / Name" value={form.receiver_name} />
                {form.receiver_phone && <Row label="Téléphone" value={form.receiver_phone} />}
                {form.receiver_bank_name && <Row label="Banque" value={form.receiver_bank_name} />}
                {form.receiver_bank_account && <Row label="N° compte" value={form.receiver_bank_account} />}
                {form.receiver_interac_email && <Row label="Email Interac" value={form.receiver_interac_email} />}
                {form.notes && <Row label="Notes" value={form.notes} />}
              </CardContent>
            </Card>

            <div className="glass-card rounded-xl p-4 border-[#D4AF37]/20 flex items-start gap-3">
              <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <p className="text-[#A1A1AA] text-sm leading-relaxed">{t.disclaimer}</p>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(2)} className="border-white/10 text-white hover:bg-white/5" data-testid="step-3-back">
                <ArrowLeft className="w-4 h-4 mr-2" /> {t.back}
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold py-6" data-testid="submit-transfer">
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t.creating}</>
                ) : (
                  <><Check className="w-5 h-5 mr-2" />{t.confirmTransfer}</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ─────────────── STEP 4 ─────────────── */}
        {step === 4 && created && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-2xl p-6 border-[#D4AF37]/30 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <h2 className="text-white text-xl font-bold">{t.successTitle}</h2>
              <p className="text-[#A1A1AA] text-sm">{t.trackingLabel}</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-[#D4AF37] font-mono text-lg font-bold tracking-wider bg-[#D4AF37]/10 px-4 py-2 rounded-lg">
                  {created.tracking_number}
                </code>
                <CopyBtn text={created.tracking_number} />
              </div>
              <p className="text-[#555] text-xs">{t.trackingNote}</p>
            </div>

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
                    {created.payment_instructions.steps.map((stepStr, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 flex items-start gap-1">
                          <span className="text-[#A1A1AA] text-sm leading-relaxed flex-1">{stepStr}</span>
                          {(stepStr.includes('PMT-') || stepStr.includes('@') || stepStr.includes('0x') || stepStr.includes('BJ66')) && (
                            <CopyBtn text={stepStr.split(':').pop()?.trim() || stepStr} />
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

            <Card className="bg-[#0F0F0F] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#D4AF37]" />
                  {t.uploadTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {proofUploaded ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
                    <div>
                      <p className="text-green-400 font-semibold text-sm">{t.uploadSuccess}</p>
                      <p className="text-[#A1A1AA] text-xs mt-0.5">{t.uploadSuccessSub}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[#A1A1AA] text-sm">{t.uploadInstructions}</p>

                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        fileRef.current?.click();
                      }}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${proofFile ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-white/10 hover:border-[#D4AF37]/30 hover:bg-white/5'
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
                          <p className="text-[#A1A1AA] text-xs">{(proofFile.size / 1024).toFixed(0)} Ko — {t.clickToChange}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 text-[#555] mx-auto" />
                          <p className="text-[#A1A1AA] text-sm">{t.clickToSelect}</p>
                          <p className="text-[#555] text-xs">JPG, PNG, WebP, PDF · Max 5 Mo</p>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleProofUpload}
                      disabled={!proofFile || proofUploading}
                      className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold"
                    >
                      {proofUploading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.sending}</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" />{t.sendProof}</>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Bouton de sortie pour éviter de bloquer le workflow utilisateur */}
            <div className="pt-2 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/Dashboard')}
                className="text-[#A1A1AA] hover:text-white hover:bg-white/5 text-sm inline-flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                {t.finishLater}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NewTransfer;