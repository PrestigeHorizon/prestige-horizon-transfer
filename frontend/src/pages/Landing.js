import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { ArrowRight, Send, Shield, Globe, Clock, Smartphone, Building2 } from 'lucide-react';
import logoImg from '../images/white_logo_Prestige_horizon_bg.png';
import westernUnionLogo from '../images/providers/western-union.png';
import moneyGramLogo from '../images/providers/moneygram.jpg';
import riaLogo from '../images/providers/ria.jpg';
import mtnLogo from '../images/providers/mtn-momo.png';
import moovLogo from '../images/providers/moov-money.png';
import corisLogo from '../images/providers/kori-money.png';

const LOGO_URL = logoImg;

const providers = [
  { name: 'Western Union', logo: westernUnionLogo , color: '#caad05'},
  { name: 'MoneyGram', logo: moneyGramLogo, color: '#E51B24' },
  { name: 'Ria', logo: riaLogo, color: '#F37021' },
  { name: 'MTN Mobile Money', logo: mtnLogo, color: '#FFCC00' },
  { name: 'Moov Mobile Money', logo: moovLogo, color: '#00a51b' },
  { name: 'Coris Money', logo: corisLogo, color: '#0068A5' },
];

const features = [
  {
    icon: Send,
    title: 'Fast Transfers',
    description: 'Send money instantly with our network of trusted partners.',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Your transactions are protected with enterprise-grade security.',
  },
  {
    icon: Globe,
    title: 'Global Reach',
    description: 'Send to over 200 countries with competitive exchange rates.',
  },
  {
    icon: Clock,
    title: '24/7 Service',
    description: 'Our platform is always available when you need it.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Money',
    description: 'Direct transfers to MTN and Moov mobile wallets.',
  },
  {
    icon: Building2,
    title: 'Business Solutions',
    description: 'Tailored services for corporate and business clients.',
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#050505]" data-testid="landing-page">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 animate-fade-in">
              <div className="inline-block">
                <span className="text-[#D4AF37] text-sm font-semibold tracking-widest uppercase">
                  Prestige Horizon Inc.
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Send Money <br />
                <span className="text-gold-gradient">Worldwide</span> <br />
                With Confidence
              </h1>
              <p className="text-lg text-[#A1A1AA] max-w-lg leading-relaxed">
                Fast, secure, and reliable money transfers through Western Union, MoneyGram, Ria, MTN and Moov Mobile Money - all in one platform.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register">
                  <Button
                    size="lg"
                    className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold px-8 py-6 text-lg gold-glow-hover"
                    data-testid="hero-get-started"
                  >
                    Start Sending
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
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right - Logo Display */}
            <div className="hidden lg:flex justify-center items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-[#D4AF37]/20 blur-3xl rounded-full"></div>
                <img
                  src={LOGO_URL}
                  alt="Prestige Horizon"
                  className="relative z-10 w-750 h-750 object-contain animate-fade-in"
                  data-testid="hero-logo"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Providers Section */}
      <section className="py-16 bg-[#0A0A0A] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[#A1A1AA] text-sm uppercase tracking-widest mb-8">
            Our Trusted Partners
          </p>

          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
            {providers.map((provider) => (
              <div
                key={provider.name}
                className="flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: provider.color }}
                data-testid={`provider-${provider.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <img
                  src={provider.logo}
                  alt={provider.name}
                  className="h-8 w-auto object-contain grayscale hover:grayscale-0 transition"
                />
                <span className="text-lg font-semibold">
                  {provider.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose <span className="text-[#D4AF37]">Prestige Horizon Inc.</span>
            </h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
              We combine multiple transfer services into one seamless experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="glass-card p-8 rounded-xl hover:border-[#D4AF37]/30 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
                data-testid={`feature-${feature.title.toLowerCase().replace(' ', '-')}`}
              >
                <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-[#A1A1AA] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/5 to-transparent"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Send Money?
          </h2>
          <p className="text-lg text-[#A1A1AA] mb-10 max-w-2xl mx-auto">
            Join thousands of customers who trust Prestige Horizon for their international transfers.
          </p>
          <Link to="/register">
            <Button
              size="lg"
              className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold px-12 py-6 text-lg gold-glow"
              data-testid="cta-create-account"
            >
              Create Free Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src={LOGO_URL}
                alt="Prestige Horizon"
                className="w-40 md:w-48 h-auto object-contain"
              />
            </div>
            <div className="flex flex-col space-y-1 text-[#A1A1AA] text-sm">
              <p>© {new Date().getFullYear()} Prestige Horizon Inc. and its subsidiaries. All rights reserved.</p>
              <p>© {new Date().getFullYear()} Prestige Horizon Inc. et ses filiales. Tous droits réservés.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;