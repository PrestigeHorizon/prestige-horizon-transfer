import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { ArrowRight, Send, Shield, Clock, Smartphone, Building2, MapPin, ChevronRight, RefreshCw } from 'lucide-react';
import logoImg from '../images/white_logo_Prestige_horizon_bg.png';
import officeImg from '../images/phinc-office.png';
import mtnLogo from '../images/providers/mtn-momo.png';
import moovLogo from '../images/providers/moov-money.png';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const features = [
  { icon: Send,      title: 'Transferts rapides',      description: "Envoyez en quelques clics — votre argent arrive en 24 à 48h au Bénin ou au Canada." },
  { icon: Shield,    title: 'Sécurisé et fiable',      description: "Enregistré auprès du CANAFE. Chaque transfert est validé manuellement par notre équipe." },
  { icon: Smartphone,title: 'Mobile Money Bénin',      description: "Dépôt direct sur MTN Mobile Money et Moov Money — le receveur reçoit sur son téléphone." },
  { icon: Building2, title: 'Virement bancaire',       description: "Envoi et réception par virement Interac au Canada et virement bancaire au Bénin." },
  { icon: Clock,     title: 'Disponible 24h/24',       description: "Initiez votre transfert à n'importe quelle heure — notre équipe traite dès l'ouverture." },
  { icon: MapPin,    title: 'Corridor dédié',          description: "Spécialisés exclusivement Canada ↔ Bénin pour des taux et un service optimaux." },
];

const steps = [
  { number: '01', title: 'Créez votre compte',      description: "Inscription rapide avec votre email — résidents du Canada et du Bénin uniquement." },
  { number: '02', title: 'Initiez le transfert',    description: "Choisissez le montant, la méthode de paiement et les coordonnées du receveur." },
  { number: '03', title: 'Effectuez le paiement',   description: "Payez par Interac, virement bancaire ou USDC selon votre corridor." },
  { number: '04', title: 'Le receveur encaisse',    description: "Notre équipe valide et décaisse sur MTN MoMo, Moov Money ou compte bancaire." },
];

const deliveryMethods = [
  { name: 'MTN Mobile Money',  logo: mtnLogo,  color: '#FFCC00', desc: 'Portefeuille mobile Bénin' },
  { name: 'Moov Money',        logo: moovLogo, color: '#00a51b', desc: 'Portefeuille mobile Bénin' },
  { name: 'Interac',           logo: null,     color: '#D4AF37', desc: 'Virement Canada',       initials: 'IC' },
  { name: 'Virement bancaire', logo: null,     color: '#D4AF37', desc: 'Banques béninoises',    initials: 'VB' },
];

const fmtCAD = (n) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(n);
const fmtXOF = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

/* ── Calculateur interactif ── */
const LiveCalculator = () => {
  const [corridors, setCorridors] = useState([]);
  const [corridor,  setCorridor]  = useState('canada_to_benin');
  const [amount,    setAmount]    = useState('200');
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/corridors`)
      .then((r) => setCorridors(r.data))
      .catch(() => {});
  }, []);

  const calc = useCallback(async () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API_URL}/api/corridors/${corridor}/calculate?send_amount=${n}`
      );
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [corridor, amount]);

  useEffect(() => {
    const t = setTimeout(calc, 400);
    return () => clearTimeout(t);
  }, [calc]);

  const cor = corridors.find((c) => c.key === corridor);
  const isCAD = corridor === 'canada_to_benin';

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5 border-[#D4AF37]/20">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-base">Calculez votre transfert</h3>
        {loading && <RefreshCw className="w-4 h-4 text-[#D4AF37] animate-spin" />}
      </div>

      {/* Toggle corridor */}
      <div className="flex rounded-lg overflow-hidden border border-white/10">
        {[
          { key: 'canada_to_benin', label: '🇨🇦 → 🇧🇯' },
          { key: 'benin_to_canada', label: '🇧🇯 → 🇨🇦' },
        ].map((c) => (
          <button
            key={c.key}
            onClick={() => { setCorridor(c.key); setAmount(c.key === 'canada_to_benin' ? '200' : '100000'); setResult(null); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${
              corridor === c.key
                ? 'bg-[#D4AF37] text-black'
                : 'bg-transparent text-[#A1A1AA] hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div>
        <label className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-1.5 block">
          Montant à envoyer ({isCAD ? 'CAD' : 'XOF'})
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-white/10 focus:border-[#D4AF37] rounded-lg px-4 py-3 text-white text-2xl font-bold text-center outline-none transition-colors"
            min={cor?.min_amount}
            max={cor?.max_amount}
            placeholder={isCAD ? '200' : '100000'}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-sm font-medium">
            {isCAD ? 'CAD' : 'XOF'}
          </span>
        </div>
        {cor && (
          <p className="text-[#555] text-xs mt-1 text-center">
            Min {isCAD ? fmtCAD(cor.min_amount) : fmtXOF(cor.min_amount)} ·
            Max {isCAD ? fmtCAD(cor.max_amount) : fmtXOF(cor.max_amount)}
          </p>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-2.5 pt-1">
          <div className="flex justify-between text-sm">
            <span className="text-[#A1A1AA]">Frais de service</span>
            <span className="text-white">{isCAD ? fmtCAD(result.fee) : fmtXOF(result.fee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#A1A1AA]">Total à payer</span>
            <span className="text-white font-semibold">{isCAD ? fmtCAD(result.total_charged) : fmtXOF(result.total_charged)}</span>
          </div>
          <div className="h-px bg-[#D4AF37]/20" />
          <div className="flex justify-between items-center">
            <span className="text-[#A1A1AA] text-sm">Le receveur reçoit</span>
            <span className="text-[#D4AF37] text-xl font-bold">
              {isCAD ? fmtXOF(result.receive_amount) : fmtCAD(result.receive_amount)}
            </span>
          </div>
          <div className="text-center text-[#555] text-xs">
            Taux : 1 {result.send_currency} = {isCAD
              ? result.exchange_rate.toFixed(0)
              : result.exchange_rate.toFixed(5)} {result.receive_currency}
          </div>
        </div>
      )}

      <Link to="/register" className="block">
        <Button className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold gold-glow-hover">
          Envoyer maintenant
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </div>
  );
};

/* ══════════════════════════════════════════ */
const Landing = () => {
  return (
    <div className="min-h-screen bg-[#050505]" data-testid="landing-page">
      <Navbar />

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div className="space-y-8 animate-fade-in">
              <div>
                <span className="inline-block text-[#D4AF37] text-xs font-semibold tracking-widest uppercase border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-4">
                  🇨🇦 Canada · 🇧🇯 Bénin
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  Envoyez de l&apos;argent<br />
                  <span className="text-gold-gradient">Canada ↔ Bénin</span><br />
                  en toute confiance
                </h1>
              </div>
              <p className="text-lg text-[#A1A1AA] max-w-lg leading-relaxed">
                Transferts sécurisés par Interac, USDC ou virement bancaire — réception sur MTN MoMo, Moov Money ou compte bancaire béninois.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: '24–48h', label: 'Délai moyen' },
                  { value: '2%',     label: 'Frais seulement' },
                  { value: 'CANAFE', label: 'Enregistré' },
                ].map((s) => (
                  <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                    <div className="text-xl font-bold text-[#D4AF37]">{s.value}</div>
                    <div className="text-xs text-[#A1A1AA] mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <Link to="/register">
                  <Button
                    size="lg"
                    className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold px-8 py-6 text-lg gold-glow-hover"
                    data-testid="hero-get-started"
                  >
                    Commencer un transfert
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 px-8 py-6 text-lg"
                    data-testid="hero-sign-in"
                  >
                    Se connecter
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right — calculateur + photo */}
            <div className="space-y-6">
              <LiveCalculator />

              <div className="hidden lg:block relative">
                <div className="absolute -inset-2 bg-[#D4AF37]/5 rounded-2xl blur-xl" />
                <div className="relative rounded-2xl overflow-hidden border border-white/10">
                  <img
                    src={officeImg}
                    alt="Bureau Prestige Horizon"
                    className="w-full h-[220px] object-cover"
                    data-testid="hero-office"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute bottom-3 left-3 right-3 glass-card rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <div className="text-white text-xs font-semibold">Enregistré CANAFE</div>
                      <div className="text-[#A1A1AA] text-xs">Centre d&apos;analyse des opérations financières du Canada</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MODES DE LIVRAISON ── */}
      <section className="py-16 bg-[#0A0A0A] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[#A1A1AA] text-sm uppercase tracking-widest mb-10">
            Modes de réception disponibles
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {deliveryMethods.map((m) => (
              <div key={m.name} className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
                {m.logo ? (
                  <img src={m.logo} alt={m.name} className="h-9 w-auto object-contain" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: `${m.color}20`, color: m.color, border: `1px solid ${m.color}40` }}
                  >
                    {m.initials}
                  </div>
                )}
                <div>
                  <div className="text-white text-sm font-semibold">{m.name}</div>
                  <div className="text-[#A1A1AA] text-xs">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Comment ça marche</h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
              Quatre étapes simples pour envoyer de l&apos;argent en toute sécurité
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[#D4AF37]/40 to-transparent z-0" />
                )}
                <div className="glass-card rounded-xl p-6 hover:border-[#D4AF37]/30 transition-all duration-300 hover:-translate-y-1 relative z-10">
                  <div className="text-4xl font-bold text-[#D4AF37]/20 mb-3 font-mono">{step.number}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-[#A1A1AA] text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section className="py-24 bg-[#0A0A0A]" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Pourquoi choisir <span className="text-[#D4AF37]">Prestige Money Transfer</span>
            </h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
              Un service dédié, humain et transparent pour le corridor Canada–Bénin
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="glass-card p-8 rounded-xl hover:border-[#D4AF37]/30 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 80}ms` }}
                data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-[#A1A1AA] text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/5 to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Prêt à envoyer de l&apos;argent ?
          </h2>
          <p className="text-lg text-[#A1A1AA] mb-10 max-w-2xl mx-auto">
            Rejoignez les familles qui font confiance à Prestige Money Transfer pour leurs transferts Canada–Bénin.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/register">
              <Button
                size="lg"
                className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold px-12 py-6 text-lg gold-glow"
                data-testid="cta-create-account"
              >
                Créer un compte gratuit
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 px-8 py-6 text-lg">
                Déjà un compte ? Se connecter
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img src={logoImg} alt="Prestige Horizon" className="w-36 h-auto object-contain opacity-80" />
            <div className="text-center md:text-right space-y-1 text-[#A1A1AA] text-sm">
              <p>© {new Date().getFullYear()} Prestige Horizon Inc. Tous droits réservés.</p>
              <p>Enregistré auprès du CANAFE · Transferts Canada ↔ Bénin</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;