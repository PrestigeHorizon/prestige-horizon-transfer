import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X, User, LogOut, LayoutDashboard, History, PlusCircle, Settings, Globe } from 'lucide-react';
import { useState } from 'react';
import logoImg from '../images/white_logo_Prestige_horizon_bg.png';

const LOGO_URL = logoImg;

export const Navbar = ({ lang = 'fr', setLang }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = user?.is_admin
    ? [
        { path: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
      ]
    : [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/new-transfer', label: 'New Transfer', icon: PlusCircle },
        { path: '/transfers', label: 'History', icon: History },
      ];

  const handleLanguageToggle = () => {
    if (setLang) {
      setLang(lang === 'fr' ? 'en' : 'fr');
    }
  };

  return (
    <>
      <nav className="navbar relative z-50" data-testid="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

            {/* Conteneur du Logo */}
            <div className="flex items-center h-full">
              <Link
                to={user ? (user.is_admin ? '/admin' : '/dashboard') : '/'}
                className="flex items-center gap-3"
                data-testid="nav-logo"
              >
                <img
                  src={LOGO_URL}
                  alt="Prestige Horizon"
                  className="relative z-10 w-[105px] h-[105px] object-contain animate-fade-in"
                  data-testid="hero-logo"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {user && navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  data-testid={`nav-link-${link.label.toLowerCase().replace(' ', '-')}`}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ${isActive(link.path)
                    ? 'text-[#D4AF37]'
                    : 'text-[#A1A1AA] hover:text-white'
                    }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* User Menu / Auth Buttons + Lang Button */}
            <div className="hidden md:flex items-center gap-4">
              {setLang && (
                <Button
                  variant="ghost"
                  onClick={handleLanguageToggle}
                  className="flex items-center gap-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 font-medium px-3 text-sm transition-all"
                >
                  <Globe className="w-4 h-4 text-[#D4AF37]" />
                  <span>{lang === 'fr' ? 'English' : 'Français'}</span>
                </Button>
              )}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 text-white hover:bg-white/5"
                      data-testid="user-menu-trigger"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center">
                        <span className="text-black font-semibold text-sm">
                          {user.full_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm">{user.full_name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-[#0F0F0F] border-white/10">
                    <div className="px-3 py-2 text-sm text-[#A1A1AA]">
                      {user.email}
                    </div>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer" data-testid="menu-profile">
                        <Settings className="w-4 h-4" />
                        Paramètres du Profil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400"
                      data-testid="menu-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="text-white hover:bg-white/5" data-testid="nav-login">
                      {lang === 'fr' ? 'Connexion' : 'Log In'}
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold" data-testid="nav-register">
                      {lang === 'fr' ? "S'inscrire" : 'Sign Up'}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2 relative z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu avec Flou d'arrière-plan intégré */}
        {mobileMenuOpen && (
          <>
            {/* L'arrière-plan opaque et flouté (Backdrop) */}
            <div 
              className="fixed inset-0 top-20 bg-black/60 backdrop-blur-md z-40 md:hidden transition-all duration-300"
              onClick={() => setMobileMenuOpen(false)} 
            />

            {/* Le contenu du menu lui-même */}
            <div className="absolute top-20 left-0 w-full bg-[#0F0F0F] border-b border-white/10 py-4 px-4 z-50 md:hidden animate-fade-in shadow-2xl">
              {setLang && (
                <div className="px-3 pb-3 mb-2 border-b border-white/5">
                  <button
                    onClick={handleLanguageToggle}
                    className="flex items-center gap-3 text-white font-medium py-2 w-full text-left text-sm"
                  >
                    <Globe className="w-5 h-5 text-[#D4AF37]" />
                    <span>{lang === 'fr' ? 'English' : 'Français'}</span>
                  </button>
                </div>
              )}

              {user ? (
                <>
                  <div className="px-3 py-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center">
                        <span className="text-black font-semibold">
                          {user.full_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{user.full_name}</div>
                        <div className="text-sm text-[#A1A1AA]">{user.email}</div>
                      </div>
                    </div>
                  </div>
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 ${isActive(link.path) ? 'text-[#D4AF37]' : 'text-white'
                        }`}
                    >
                      <link.icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 text-white rounded-lg hover:bg-white/5"
                  >
                    <User className="w-5 h-5" />
                    Profil
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-3 text-red-400 w-full text-left rounded-lg hover:bg-red-500/10"
                  >
                    <LogOut className="w-5 h-5" />
                    Déconnexion
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-3">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-center text-white">
                      {lang === 'fr' ? 'Connexion' : 'Log In'}
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold">
                      {lang === 'fr' ? "S'inscrire" : 'Sign Up'}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </nav>
  </>
  );
};