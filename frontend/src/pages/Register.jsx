import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { UserPlus, Phone, Lock, Hash } from 'lucide-react';

const Register = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify & Register
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const requestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/register', {
        mobile,
        language: i18n.language,
      });
      setMessage(data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request OTP');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/verify-register', {
        mobile,
        otp,
        password,
        language: i18n.language,
      });
      
      // Auto login after successful registration
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('mobile', data.mobile);
      localStorage.setItem('language', data.language);
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="card w-full max-w-md p-8 glass mx-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">{t('register')}</h2>
          <p className="text-slate-500 text-sm mt-2">{t('appName')}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-teal-50 text-teal-700 p-3 rounded-lg text-sm mb-6 border border-teal-100">
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={requestOTP} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('mobileNumber')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-slate-400" size={20} />
                <input
                  type="text"
                  className="input-field pl-10"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter 10 digit number"
                  required
                  maxLength={10}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary flex justify-center items-center"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                t('requestOTP')
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">OTP</label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 text-slate-400" size={20} />
                <input
                  type="text"
                  className="input-field pl-10"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  required
                  maxLength={6}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Check console for OTP mock</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                <input
                  type="password"
                  className="input-field pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary flex justify-center items-center"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus size={20} className="mr-2" />
                  {t('register')}
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">
            {t('login')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
