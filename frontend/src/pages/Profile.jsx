import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogOut, Phone, Shield } from 'lucide-react';

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const mobile = localStorage.getItem('mobile');
  const role = localStorage.getItem('role');
  const name = localStorage.getItem('username') || 'User';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('mobile');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800">{t('profile')}</h1>
      </div>

      <div className="card glass p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 mb-4 border-4 border-white shadow-sm">
            <User size={48} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">{name}</h2>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase mt-2 tracking-wider">
            {role}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
            <Phone size={20} className="text-slate-400 mr-4" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('mobileNumber')}</p>
              <p className="text-slate-700 font-medium">+91 {mobile}</p>
            </div>
          </div>

          <div className="flex items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
            <Shield size={20} className="text-slate-400 mr-4" />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('status')}</p>
              <p className="text-emerald-600 font-medium">Active Account</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <button
            onClick={() => navigate('/change-password')}
            className="flex items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all hover:shadow-sm"
          >
            <Lock size={18} />
            {t('changePassword')}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 p-4 rounded-xl bg-rose-50 text-rose-600 font-semibold hover:bg-rose-100 transition-all hover:shadow-sm"
          >
            <LogOut size={18} />
            {t('logout')}
          </button>
        </div>
      </div>

      <div className="text-center p-4">
        <p className="text-slate-400 text-sm">
          {t('appName')} &copy; 2026
        </p>
      </div>
    </div>
  );
};

export default Profile;
