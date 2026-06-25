import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Globe } from 'lucide-react';
import logoImg from '../images/white_logo_Prestige_horizon_bg.png';
import officeBg from '../images/amazone2.jpg';
import React from "react";

const LOGO_URL = logoImg;

const translations = {
  fr: {
    backHome: 'Retour à l\'accueil',
    welcome: 'Ravi de vous revoir',
    subtitle: 'Connectez-vous à votre compte pour continuer',
    emailLabel: 'Adresse Email',
    passwordLabel: 'Mot de passe',
    signInBtn: 'Se connecter',
    signingIn: 'Connexion en cours...',
    noAccount: 'Vous n\'avez pas de compte ?',
    createAccount: 'Créer un compte',
    toastSuccess: 'Bon retour parmi nous !',
    toastError: 'Identifiants invalides',
    rightTitle: 'Transferts Sécurisés',
    rightDesc: 'Votre argent est protégé par des mesures de sécurité de pointe.'
  },
  en: {
    backHome: 'Back to Home',
    welcome: 'Welcome Back',
    subtitle: 'Sign in to your account to continue',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    signInBtn: 'Sign In',
    signingIn: 'Signing in...',
    noAccount: 'Don\'t have an account?',
    createAccount: 'Create Account',
    toastSuccess: 'Welcome back!',
    toastError: 'Invalid credentials',
    rightTitle: 'Secure Transfers',
    rightDesc: 'Your money is protected with industry-leading security measures.'
  }
};

// Optionnel : On peut recevoir syncLangFromLogin pour mettre à jour l'état global immédiatement au changement
const Login = ({ onLangChange }) => {
  // Initialise avec le localStorage s'il existe, sinon 'fr'
  const [lang, setLang] = useState(() => localStorage.getItem('prestige_lang') || 'fr');
  const t = translations[lang] || translations.fr;

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('prestige_lang', lang);
    if (onLangChange) onLangChange(lang); // Alerte le parent du changement
  }, [lang, onLangChange]);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(formData.email, formData.password);
      toast.success(t.toastSuccess);
      navigate(user.is_admin ? '/admin' : '/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || t.toastError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex relative" data-testid="login-page">
      
      {/* Sélecteur de langue discret en haut à droite du formulaire */}
      <div className="absolute top-6 left-6 lg:left-auto lg:right-[52%] z-20">
        <button
          onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/30 px-3 py-1.5 rounded-full bg-[#111]/80 backdrop-blur transition-all"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === 'fr' ? 'EN' : 'FR'}
        </button>
      </div>

      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-12">
        <Link
          to="/"
          className="flex items-center gap-2 text-[#A1A1AA] hover:text-white transition-colors mb-12 w-fit"
          data-testid="back-to-home"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.backHome}
        </Link>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          <div className="mb-10">
            <img src={LOGO_URL} alt="Prestige Horizon" className="w-50 md:w-58 h-auto object-contain" />
            <h1 className="text-3xl font-bold text-white mb-2 mt-4">{t.welcome}</h1>
            <p className="text-[#A1A1AA]">{t.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#A1A1AA]">{t.emailLabel}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-white/30"
                  required
                  data-testid="login-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#A1A1AA]">{t.passwordLabel}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-white/30"
                  required
                  data-testid="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold py-6"
              data-testid="login-submit"
            >
              {loading ? t.signingIn : t.signInBtn}
            </Button>
          </form>

          <p className="mt-8 text-center text-[#A1A1AA]">
            {t.noAccount}{' '}
            <Link to="/register" className="text-[#D4AF37] hover:underline" data-testid="login-register-link">
              {t.createAccount}
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div
        className="hidden lg:flex w-1/2 items-center justify-center relative overflow-hidden bg-[#0A0A0A]"
        style={{
          backgroundImage: `url(${officeBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-black/65"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-transparent"></div>

        <div className="relative z-10 text-center p-12">
          <h2 className="text-6xl font-bold text-yellow-500 mb-4 drop-shadow-[0_0_8px_rgba(212,175,55,0.35)]">
            {t.rightTitle}
          </h2>
          <p className="text-2xl text-yellow-500 max-w-sm mx-auto">
            {t.rightDesc}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;