import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import {
  ArrowRight,
  Shield,
  Clock,
  Smartphone,
  Building2,
  Send,
  RefreshCw,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const fmtCAD = (n, lang) => new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(n);
const fmtXOF = (n, lang) => new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

// Dictionnaires de traduction
const translations = {
  fr: {
    langLabel: "English",
    heroTag: "🇨🇦 Canada ↔ 🇧🇯 Bénin",
    heroTitle1: "Envoyez de l'argent",
    heroTitle2: "en toute confiance",
    heroDesc: "Transferts sécurisés du Canada vers le Bénin et du Bénin vers le Canada. Paiement par Interac, USDC ou virement bancaire.",
    btnStart: "Commencer maintenant",
    btnLogin: "Se connecter",
    stats: [
      { value: '24-48h', label: 'Délai moyen' },
      { value: '2%', label: 'Frais' },
      { value: 'CANAFE', label: 'Enregistré' },
    ],
    calcTitle: "Calculateur de transfert",
    calcLabel: "Montant à envoyer",
    calcMinMax: "Min {{min}} · Max {{max}}",
    calcFees: "Frais de service",
    calcTotal: "Total à payer",
    calcReceive: "Le receveur reçoit",
    calcRate: "Taux",
    calcBtn: "Envoyer maintenant",
    featuresTitle: "Pourquoi choisir Prestige Money Transfer ?",
    features: [
      { title: "Rapide", description: "Transferts complétés sous 24 à 48 heures." },
      { title: "Sécurisé", description: "Entreprise enregistrée auprès du CANAFE." },
      { title: "Mobile Money", description: "Réception sur MTN Mobile Money et Moov Money." },
      { title: "Banques", description: "Dépôt direct sur les comptes bancaires béninois." }
    ],
    howItWorksTitle: "Comment ça marche ?",
    steps: ["Créer un compte", "Initier un transfert", "Effectuer le paiement", "Réception des fonds"],
    testimonialsTitle: "Ce que disent nos clients",
    testimonials: [
      { name: "Abdoul-Wassiou - Gatineau", text: "Service rapide et fiable. Ma famille reçoit l'argent sans problème." },
      { name: "Aicha - Longueuil", text: "Les frais sont transparents et le support répond rapidement." },
      { name: "Genevieve - Québec", text: "Je recommande Prestige Money Transfer à toute la diaspora béninoise." }
    ],
    complianceTitle: "Conforme et Sécurisé",
    complianceDesc: "Prestige Money Transfer est enregistré auprès du CANAFE et applique les meilleures pratiques de conformité et de lutte contre le blanchiment d'argent.",
    ctaTitle: "Commencez votre premier transfert aujourd'hui",
    ctaDesc: "Inscription gratuite. Aucun engagement.",
    ctaBtn: "Créer un compte",
    footerRights: "Tous droits réservés."
  },
  en: {
    langLabel: "Français",
    heroTag: "🇨🇦 Canada ↔ 🇧🇯 Benin",
    heroTitle1: "Send money",
    heroTitle2: "with confidence",
    heroDesc: "Secure transfers from Canada to Benin and from Benin to Canada. Payment via Interac, USDC, or bank transfer.",
    btnStart: "Get started now",
    btnLogin: "Log In",
    stats: [
      { value: '24-48h', label: 'Average delay' },
      { value: '2%', label: 'Fees' },
      { value: 'FINTRAC', label: 'Registered' },
    ],
    calcTitle: "Transfer Calculator",
    calcLabel: "Amount to send",
    calcMinMax: "Min {{min}} · Max {{max}}",
    calcFees: "Service Fees",
    calcTotal: "Total to Pay",
    calcReceive: "Recipient receives",
    calcRate: "Rate",
    calcBtn: "Send Money Now",
    featuresTitle: "Why choose Prestige Money Transfer?",
    features: [
      { title: "Fast", description: "Transfers completed within 24 to 48 hours." },
      { title: "Secure", description: "Company registered with FINTRAC." },
      { title: "Mobile Money", description: "Received on MTN Mobile Money and Moov Money." },
      { title: "Banks", description: "Direct deposit to Beninese bank accounts." }
    ],
    howItWorksTitle: "How It Works",
    steps: ["Create an account", "Initiate a transfer", "Make the payment", "Receive funds"],
    testimonialsTitle: "What our clients say",
    testimonials: [
      { name: "Abdoul-Wassiou - Gatineau", text: "Fast and reliable service. My family receives the money with no issues." },
      { name: "Aicha - Longueuil", text: "Fees are transparent and support team responds quickly." },
      { name: "Genevieve - Quebec", text: "I recommend Prestige Money Transfer to the entire Beninese diaspora." }
    ],
    complianceTitle: "Compliant and Secure",
    complianceDesc: "Prestige Money Transfer is registered with FINTRAC and applies the best practices for compliance and anti-money laundering.",
    ctaTitle: "Start your first transfer today",
    ctaDesc: "Free registration. No commitment.",
    ctaBtn: "Create an account",
    footerRights: "All rights reserved."
  }
};

/* ── Calculateur interactif intelligent ── */
const LiveCalculator = ({ lang, t }) => {
  const [corridors, setCorridors] = useState([]);
  const [corridor, setCorridor] = useState('canada_to_benin');
  const [amount, setAmount] = useState('200');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/corridors`)
      .then((r) => setCorridors(r.data))
      .catch(() => { });
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
    const timeoutId = setTimeout(calc, 400);
    return () => clearTimeout(timeoutId);
  }, [calc]);

  const cor = corridors.find((c) => c.key === corridor);
  const isCAD = corridor === 'canada_to_benin';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">{t.calcTitle}</h2>
        {loading && <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />}
      </div>

      {/* Toggle corridor */}
      <div className="flex rounded-xl overflow-hidden border border-zinc-800 bg-black p-1">
        {[
          { key: 'canada_to_benin', label: '🇨🇦 → 🇧🇯' },
          { key: 'benin_to_canada', label: '🇧🇯 → 🇨🇦' },
        ].map((c) => (
          <button
            key={c.key}
            onClick={() => { setCorridor(c.key); setAmount(c.key === 'canada_to_benin' ? '200' : '100000'); setResult(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${corridor === c.key
              ? 'bg-yellow-500 text-black'
              : 'bg-transparent text-gray-400 hover:text-white'
              }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">
          {t.calcLabel} ({isCAD ? 'CAD' : 'XOF'})
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-black border border-zinc-700 focus:border-yellow-500 rounded-xl px-4 py-4 text-white text-2xl font-bold text-center outline-none transition-colors"
            min={cor?.min_amount}
            max={cor?.max_amount}
            placeholder={isCAD ? '200' : '100000'}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
            {isCAD ? 'CAD' : 'XOF'}
          </span>
        </div>
        {cor && (
          <p className="text-gray-500 text-xs mt-1.5 text-center">
            {t.calcMinMax
              .replace('{{min}}', isCAD ? fmtCAD(cor.min_amount, lang) : fmtXOF(cor.min_amount, lang))
              .replace('{{max}}', isCAD ? fmtCAD(cor.max_amount, lang) : fmtXOF(cor.max_amount, lang))}
          </p>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-3 pt-2 border-t border-zinc-800">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{t.calcFees}</span>
            <span className="text-white">{isCAD ? fmtCAD(result.fee, lang) : fmtXOF(result.fee, lang)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{t.calcTotal}</span>
            <span className="text-white font-semibold">{isCAD ? fmtCAD(result.total_charged, lang) : fmtXOF(result.total_charged, lang)}</span>
          </div>
          <div className="h-px bg-zinc-800" />
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">{t.calcReceive}</span>
            <span className="text-yellow-500 text-2xl font-bold">
              {isCAD ? fmtXOF(result.receive_amount, lang) : fmtCAD(result.receive_amount, lang)}
            </span>
          </div>
          <div className="text-center text-gray-500 text-xs pt-1">
            {t.calcRate} : 1 {result.send_currency} = {isCAD
              ? result.exchange_rate.toFixed(0)
              : result.exchange_rate.toFixed(5)} {result.receive_currency}
          </div>
        </div>
      )}

      <Link to="/register" className="block pt-2">
        <Button className="w-full bg-yellow-500 text-black hover:bg-yellow-400 font-bold py-4 h-auto rounded-xl shadow-lg transition">
          {t.calcBtn}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </Link>
    </div>
  );
};

/* ── Composant principal de la page d'accueil ── */
const Landing = ({ onLangChange }) => {

  const [lang, setLang] = useState(() => localStorage.getItem('prestige_lang') || 'fr');

  useEffect(() => {
    document.title = lang === 'fr'
      ? "Page De Destination | Prestige Money Transfer"
      : "Landing Page | Prestige Money Transfer";
  }, [lang]); // Se déclenche au chargement et si la langue change

  useEffect(() => {
    localStorage.setItem('prestige_lang', lang);
    if (onLangChange) onLangChange(lang);
  }, [lang, onLangChange]);
  
  const t = translations[lang];

  const featureIcons = [Clock, Shield, Smartphone, Building2];

  return (
    <div className="bg-black text-white min-h-screen">
      <Navbar lang={lang} setLang={setLang} />

      {/* HERO SECTION ─ Modifiée ici pour le mobile (pt-24) */}
      <section className="relative overflow-hidden pt-24 md:pt-20">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left Content */}
            <div>
              <div className="inline-flex items-center border border-yellow-500/30 rounded-full px-4 py-2 text-yellow-500 mb-6 font-medium text-sm">
                {t.heroTag}
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                {t.heroTitle1}
                <span className="block text-yellow-500">
                  {t.heroTitle2}
                </span>
              </h1>

              <p className="mt-6 text-xl text-gray-400 max-w-xl leading-relaxed">
                {t.heroDesc}
              </p>

              <div className="flex flex-wrap gap-4 mt-10">
                <Link
                  to="/register"
                  className="bg-yellow-500 text-black px-8 py-4 rounded-xl font-semibold flex items-center gap-2 hover:bg-yellow-400 transition shadow-lg"
                >
                  {t.btnStart}
                  <ArrowRight size={20} />
                </Link>

                <Link
                  to="/login"
                  className="border border-yellow-500 text-yellow-500 px-8 py-4 rounded-xl hover:bg-yellow-500 hover:text-black transition"
                >
                  {t.btnLogin}
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-12 border-t border-zinc-900 pt-8">
                {t.stats.map((s, index) => (
                  <div key={index}>
                    <div className="text-yellow-500 text-3xl font-bold">
                      {s.value}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Interactive Calculator */}
            <div>
              <LiveCalculator lang={lang} t={t} />
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold">
              {t.featuresTitle}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {t.features.map((item, index) => {
              const IconComponent = featureIcons[index] || Shield;
              return (
                <div key={index} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800/50">
                  <IconComponent className="text-yellow-500 mb-4" size={32} />
                  <h3 className="font-semibold text-xl mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">
            {t.howItWorksTitle}
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            {t.steps.map((step, i) => (
              <div key={i} className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800/30">
                <div className="text-yellow-500 text-4xl font-bold mb-4 font-mono">
                  0{i + 1}
                </div>
                <h3 className="font-semibold text-lg text-white">
                  {step}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="bg-zinc-950 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">
            {t.testimonialsTitle}
          </h2>

          <div className="grid lg:grid-cols-3 gap-8">
            {t.testimonials.map((client, index) => (
              <div key={index} className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800/30">
                <p className="text-gray-300 mb-6 italic leading-relaxed">
                  "{client.text}"
                </p>
                <div className="font-semibold text-yellow-500">
                  {client.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPLIANCE SECTION */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Shield size={64} className="mx-auto text-yellow-500 mb-6" />
          <h2 className="text-4xl font-bold mb-6">
            {t.complianceTitle}
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            {t.complianceDesc}
          </p>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 bg-gradient-to-r from-yellow-500/10 to-transparent">
        <div className="max-w-5xl mx-auto text-center px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t.ctaTitle}
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            {t.ctaDesc}
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-3 bg-yellow-500 text-black px-10 py-5 rounded-xl font-semibold text-lg hover:bg-yellow-400 transition shadow-xl"
          >
            {t.ctaBtn}
            <Send size={20} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 py-8 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Prestige Horizon Inc. {t.footerRights}
      </footer>
    </div>
  );
};

export default Landing;