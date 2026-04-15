import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Globe, Menu, X, Calculator, Users, FileText, LayoutDashboard, Lock } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ta' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('mobile');
    navigate('/login');
  };

  const navLinks = [
    { name: t('dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { name: t('emiCalculator'), path: '/emi-calculator', icon: LayoutDashboard }, // using placeholder
    { name: t('customers'), path: '/customers', icon: Users },
    { name: t('loans'), path: '/loans', icon: FileText },
  ];

  if (!token) return null; // Don't show navbar on login/register if not logged in

  return (
    <nav className="bg-dark-bg text-dark-text shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-teal-200 bg-clip-text text-transparent">
              {t('appName')}
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1 transition-colors hover:text-primary-400 ${
                    isActive ? 'text-primary-500 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/change-password"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 transition"
            >
              <Lock size={16} className="text-slate-300" />
              <span className="text-sm font-medium text-slate-300">Password</span>
            </Link>
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 transition"
            >
              <Globe size={16} className="text-primary-400" />
              <span className="text-sm font-medium">
                {i18n.language === 'en' ? t('tamil') : t('english')}
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-red-400 hover:text-red-300 transition"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">{t('logout')}</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-300 hover:text-white focus:outline-none"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700">
          <div className="px-4 py-3 space-y-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-2 w-full px-3 py-2 rounded-md ${
                    location.pathname === link.path ? 'bg-primary-900/50 text-primary-400' : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
            <div className="border-t border-slate-700 my-2 pt-2 space-y-3">
              <Link
                to="/change-password"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-slate-300 hover:bg-slate-700"
              >
                <Lock size={18} className="text-slate-300" />
                <span>Change Password</span>
              </Link>
              <button
                onClick={() => { toggleLanguage(); setIsMenuOpen(false); }}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-slate-300 hover:bg-slate-700"
              >
                <Globe size={18} className="text-primary-400" />
                <span>{i18n.language === 'en' ? t('tamil') : t('english')}</span>
              </button>
              <button
                onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-red-400 hover:bg-slate-700"
              >
                <LogOut size={18} />
                <span>{t('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
