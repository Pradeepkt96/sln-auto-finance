import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogOut, Phone, Shield, Save, Edit2 } from 'lucide-react';
import sln from '../api';

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const mobile = localStorage.getItem('mobile');
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('mobile');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const { data } = await sln.put('/auth/profile', { username });
      localStorage.setItem('username', data.username);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      <div className="card glass p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 mb-4 border-4 border-white shadow-sm">
            <User size={48} />
          </div>
          
          {isEditing ? (
            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
              <input
                type="text"
                className="input-field py-2 text-center text-lg font-bold"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateProfile}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all shadow-sm"
                >
                  <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setIsEditing(false); setUsername(localStorage.getItem('username') || ''); }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-all shadow-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 group">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">{username || 'User'}</h2>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded-md text-slate-300 hover:text-primary-500 hover:bg-primary-50 transition-all"
                >
                  <Edit2 size={14} />
                </button>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase mt-2 tracking-widest">
                {role}
              </span>
            </div>
          )}
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
