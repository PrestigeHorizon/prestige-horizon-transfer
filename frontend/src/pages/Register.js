import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, Phone, Globe, ArrowLeft, Shield, Send } from 'lucide-react';
import logoImg from '../images/white_logo_Prestige_horizon_bg.png';

/* Seuls Canada et Bénin sont acceptés par le backend */
const COUNTRIES = [
  { value: 'Canada', label: '🇨🇦 Canada', hint: 'Interac / USDC' },
  { value: 'Bénin',  label: '🇧🇯 Bénin',  hint: 'MTN MoMo · Moov · Virement' },
];

const FEATURES = [
  { icon: Send,   text: 'Transferts Canada ↔ Bénin en 24–48h' },
  { icon: Shield, text: 'Service enregistré auprès du CANAFE' },
  { icon: Phone,  text: 'Réception sur MTN MoMo, Moov Money ou virement' },
];

const Register = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email:     '',
    phone:     '',
    country:   'Canada',
    password:  '',
  });

  const set = (field) => (e) =>
    setFormData((p) => ({ ...p, [field]: typeof e === 'string' ? e : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    try {
      await register(formData);
      toast.success('Compte créé avec succès !');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || "Échec de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry = COUNTRIES.find((c) => c.value === formData.country);

  return (
    <div className="min-h-screen bg-[#050505] flex" data-testid="register-page">

      {/* ── Panneau gauche décoratif ── */}
      <div className="hidden lg:flex w-1/2 bg-[#0A0A0A] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl" />
        <div className="relative z-10 text-center p-12 space-y-10">
          <div className="relative">
            <div className="absolute inset-0 bg-[#D4AF37]/10 blur-3xl rounded-full" />
            <img src={logoImg} alt="Prestige Horizon" className="relative z-10 w-52 mx-auto object-contain" data-testid="hero-logo" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#D4AF37]">Bienvenue</h2>
            <p className="text-[#A1A1AA] max-w-xs mx-auto text-sm leading-relaxed">
              Le service de transfert dédié au corridor <strong className="text-white">Canada ↔ Bénin</strong>
            </p>
          </div>
          <ul className="space-y-4 text-left max-w-xs mx-auto">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-[#A1A1AA]">
                <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[#D4AF37]" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-12 overflow-y-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[#A1A1AA] hover:text-white transition-colors mb-8 w-fit text-sm"
          data-testid="back-to-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          <div className="mb-8">
            <img src={logoImg} alt="Prestige Horizon" className="h-12 mb-6 lg:hidden" />
            <h1 className="text-3xl font-bold text-white mb-1">Créer un compte</h1>
            <p className="text-[#A1A1AA] text-sm">Envoyez de l&apos;argent entre le Canada et le Bénin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nom complet */}
            <div className="space-y-1.5">
              <Label className="text-[#A1A1AA] text-sm">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <Input
                  type="text"
                  placeholder="Prénom Nom"
                  value={formData.full_name}
                  onChange={set('full_name')}
                  className="pl-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-white/30"
                  required
                  data-testid="register-fullname"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-[#A1A1AA] text-sm">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <Input
                  type="email"
                  placeholder="vous@exemple.com"
                  value={formData.email}
                  onChange={set('email')}
                  className="pl-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-white/30"
                  required
                  data-testid="register-email"
                />
              </div>
            </div>

            {/* Pays — seulement Canada / Bénin */}
            <div className="space-y-1.5">
              <Label className="text-[#A1A1AA] text-sm">Pays de résidence</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA] z-10 pointer-events-none" />
                <Select value={formData.country} onValueChange={set('country')}>
                  <SelectTrigger
                    className="pl-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white"
                    data-testid="register-country"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-white">
                        <div>
                          <span>{c.label}</span>
                          <span className="text-[#555] text-xs ml-2">{c.hint}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCountry && (
                <p className="text-[#555] text-xs flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Service disponible uniquement pour les résidents du Canada et du Bénin
                </p>
              )}
            </div>

            {/* Téléphone */}
            <div className="space-y-1.5">
              <Label className="text-[#A1A1AA] text-sm">Numéro de téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <Input
                  type="tel"
                  placeholder={formData.country === 'Canada' ? '+1 514 000 0000' : '+229 01 00 00 00 00'}
                  value={formData.phone}
                  onChange={set('phone')}
                  className="pl-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-white/30"
                  required
                  data-testid="register-phone"
                />
              </div>
              <p className="text-[#555] text-xs">Format international ({formData.country === 'Canada' ? '+1' : '+229'})</p>
            </div>

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <Label className="text-[#A1A1AA] text-sm">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 caractères"
                  value={formData.password}
                  onChange={set('password')}
                  className="pl-10 pr-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-white/30"
                  required
                  minLength={6}
                  data-testid="register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Indicateur de force */}
            {formData.password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      formData.password.length >= i * 4 ? 'bg-[#D4AF37]' : 'bg-white/10'
                    }`} />
                  ))}
                </div>
                <p className="text-xs text-[#555]">
                  {formData.password.length < 4 ? 'Faible' : formData.password.length < 8 ? 'Moyen' : 'Fort'}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold py-6 mt-2 gold-glow-hover"
              data-testid="register-submit"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2 inline-block" />Création en cours…</>
              ) : (
                'Créer mon compte'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-[#A1A1AA] text-sm">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-[#D4AF37] hover:underline font-medium" data-testid="register-login-link">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;