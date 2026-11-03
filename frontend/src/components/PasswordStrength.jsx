import { useTranslation } from 'react-i18next';
import { getPasswordStrength } from '../utils/passwordStrength';

const strengthColors = {
  empty: 'bg-slate-200 text-slate-500',
  weak: 'bg-rose-500 text-rose-600',
  fair: 'bg-amber-500 text-amber-600',
  strong: 'bg-emerald-500 text-emerald-600',
};

const PasswordStrength = ({ password, username = '' }) => {
  const { t } = useTranslation();
  const { checks, score, strength } = getPasswordStrength(password, username);

  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{t('passwordStrength')}</span>
        <span className={`font-semibold ${strengthColors[strength].split(' ')[1]}`}>
          {t(`passwordStrength${strength.charAt(0).toUpperCase()}${strength.slice(1)}`)}
        </span>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {checks.map(({ key }, index) => (
          <div
            key={key}
            className={`h-1.5 flex-1 rounded-full ${index < score ? strengthColors[strength].split(' ')[0] : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500">
        {checks.map(({ key, valid }) => (
          <li key={key} className={valid ? 'text-emerald-700' : ''}>
            {valid ? '✓ ' : '○ '}{t(key)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrength;
