import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator } from 'lucide-react';

const EmiCalculator = () => {
  const { t } = useTranslation();
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('2');
  const [installments, setInstallments] = useState('');
  const [emi, setEmi] = useState(null);
  const [handAmount, setHandAmount] = useState(null);

  const roundToNearestHundred = (value) => Math.round(value / 100) * 100;

  const calculateEMI = (e) => {
    e.preventDefault();
    if (!loanAmount || !interestRate || !installments) return;

    const p = parseFloat(loanAmount);
    const r = parseFloat(interestRate) / 100;
    const n = parseInt(installments, 10);

    const emiValue = (p * r) + p / n;
    const roundedEmi = roundToNearestHundred(emiValue);

    // Hand amount after deducting charges: (loan amount * 10%) + 1000
    const charges = (p * 0.1) + 1000;
    const handValue = p - charges;

    setEmi(roundedEmi);
    setHandAmount(handValue.toFixed(2));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      <div className="card glass p-8">
        <form onSubmit={calculateEMI} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('loanAmount')} (₹)</label>
              <input
                type="number"
                className="input-field"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="Ex: 50000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('interestRate')} (%)</label>
              <input
                type="number"
                step="0.1"
                className="input-field"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="Ex: 2.0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('installments')} (Months)</label>
              <input
                type="number"
                className="input-field"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                placeholder="Ex: 12"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="btn-primary w-auto sm:w-1/3">
              {t('calculateEMI')}
            </button>
          </div>
        </form>

        {emi !== null && (
          <div className="mt-8 p-6 bg-gradient-to-r from-teal-50 to-primary-50 border border-t border-primary-100 rounded-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-700">{t('emiAmount')}</h3>
                <p className="text-sm text-slate-500">{t('fixedMonthlyInstallment')}</p>
              </div>
              <div className="text-3xl font-bold text-primary-600 bg-white px-6 py-3 rounded-lg shadow-sm border border-primary-100">
                ₹ {Number(emi).toLocaleString('en-IN')}
              </div>
            </div>
            {handAmount !== null && (
              <div className="flex items-center justify-between bg-white px-6 py-4 rounded-lg shadow-sm border border-slate-200">
                <div>
                  <h3 className="text-lg font-medium text-slate-700">{t('amountInHand')}</h3>
                  <p className="text-sm text-slate-500">{t('afterDeductingCharges')}</p>
                </div>
                <div className="text-3xl font-bold text-slate-800">
                  ₹ {Number(handAmount).toLocaleString('en-IN')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmiCalculator;
