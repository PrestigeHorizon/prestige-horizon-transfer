import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, Phone, Globe, ArrowLeft } from 'lucide-react';

import logoImg from '../images/white_logo_Prestige_horizon_bg.png';

const LOGO_URL = logoImg;

const countries = [
  'Burkina Faso',
  'Mali',
  'Côte d\'Ivoire',
  'Senegal',
  'Niger',
  'Benin',
  'Togo',
  'Ghana',
  'Nigeria',
  'France',
  'USA',
  'Canada',
  'Other',
];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: 'Benin',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex" data-testid="register-page">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex w-1/2 bg-[#0A0A0A] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-transparent"></div>
        <div className="relative z-10 text-center p-12">
          <div className="w-300 h-300 mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-[#D4AF37]/20 blur-3xl rounded-full"></div>
            <img
              src={LOGO_URL}
              alt="Prestige Horizon"
              className="relative z-10 w-250 h-250 object-contain animate-fade-in"
              data-testid="hero-logo"
            />
          </div>
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: 'rgb(212 175 55 / var(--tw-text-opacity, 1))' }}
          >
            Join Our Network
          </h2>
          <p className="text-[#A1A1AA] max-w-sm mx-auto"
            style={{ color: 'rgb(212 175 55 / var(--tw-text-opacity, 1))' }}
          >
            Send money globally with Western Union, MoneyGram, Ria, MTN and Moov
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-12">
        <Link
          to="/"
          className="flex items-center gap-2 text-[#A1A1AA] hover:text-white transition-colors mb-8 w-fit"
          data-testid="back-to-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          <div className="mb-8">
            <img src={LOGO_URL} alt="Prestige Horizon" className="h-14 mb-6 lg:hidden" />
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-[#A1A1AA]">Start sending money worldwide today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-[#A1A1AA]">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" />
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Prestige Horizon Inc"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="pl-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-white/30"
                  required
                  data-testid="register-fullname"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#A1A1AA]">Email Address</Label>
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
                  data-testid="register-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#A1A1AA]">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+229 01 00 00 00 00"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-white/30"
                  required
                  data-testid="register-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-[#A1A1AA]">Country</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA] z-10 pointer-events-none" />
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger
                    className="pl-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white"
                    data-testid="register-country"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10">
                    {countries.map((country) => (
                      <SelectItem key={country} value={country} className="text-white hover:bg-white/10">
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#A1A1AA]">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white placeholder:text-white/30"
                  required
                  minLength={6}
                  data-testid="register-password"
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
              className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold py-6 mt-2"
              data-testid="register-submit"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-[#A1A1AA]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#D4AF37] hover:underline" data-testid="register-login-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
