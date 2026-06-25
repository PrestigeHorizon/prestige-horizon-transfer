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

const Login = ({ onLangChange }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('prestige_lang') || 'fr');
  const t = translations[lang] || translations.fr;

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('prestige_lang', lang);
    if (onLangChange) onLangChange(lang);
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
    <div className="min-h-screen bg-[#050505] flex relative overflow-x-hidden" data-testid="login-page">

      {/* Sélecteur de langue - Repositionné proprement en haut à droite de la zone active */}
      <div className="absolute top-6 right-6 z-20 lg:right-auto lg:left-[calc(50%-5rem)]">
        <button
          onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/30 px-3 py-1.5 rounded-full bg-[#111]/80 backdrop-blur transition-all"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === 'fr' ? 'EN' : 'FR'}
        </button>
      </div>

      {/* Left Side - Form (Ajusté pour défiler proprement si l'écran est très petit en hauteur) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 sm:px-8 md:px-16 lg:px-20 py-12 min-h-screen">
        <div className="max-w-md w-full mx-auto flex flex-col h-full justify-center">
          
          <Link
            to="/"
            className="flex items-center gap-2 text-white hover:text-yellow-500 transition-colors mb-8 w-fit text-lg"
            data-testid="back-to-home"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backHome}
          </Link>

          <div className="mb-8">
            <img src={LOGO_URL} alt="Prestige Horizon" className="w-50 md:w-58 h-auto object-contain" />
            <h1 className="text-2xl sm:text-3xl font-bold text-yellow-500 mb-2 mt-4">{t.welcome}</h1>
            <p className="text-white/70 text-sm sm:text-base">{t.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="pl-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-white/30 h-11"
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
                  className="pl-10 pr-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-white/30 h-11"
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
              className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold py-5 mt-2"
              data-testid="login-submit"
            >
              {loading ? t.signingIn : t.signInBtn}
            </Button>
          </form>

          <p className="mt-6 text-center text-white/60 text-lg">
            {t.noAccount}{' '}
            <Link to="/register" className="text-[#D4AF37] hover:underline hover:text-yellow-500" data-testid="login-register-link">
              {t.createAccount}
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Decorative (Reste masqué sur mobile/tablette, s'affiche parfaitement sur desktop) */}
      <div
        className="hidden lg:flex w-1/2 items-center justify-center relative overflow-hidden bg-[#0A0A0A]"
        style={{
          backgroundImage: `url(${officeBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-black/15"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-transparent"></div>

        <div className="relative z-10 text-center p-8 lg:p-12">
          <h2 className="text-4xl xl:text-6xl font-bold text-yellow-500 mb-4 drop-shadow-[0_0_8px_rgba(212,175,55,0.35)]">
            {t.rightTitle}
          </h2>
          <p className="text-lg xl:text-2xl text-white max-w-sm mx-auto low-desc">
            {t.rightDesc}
          </p>
        </div>
      </div>
      
    </div>
  );
};

export default Login;