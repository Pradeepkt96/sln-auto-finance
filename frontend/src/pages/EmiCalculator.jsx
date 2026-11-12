import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight } from 'lucide-react';
import {
  calculateAmountInHand,
  calculateEmi,
  calculateLoanAmountFromHand,
} from '../utils/emiCalculator';

const EmiCalculator = () => {
  const { t } = useTranslation();
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('2');
  const [installments, setInstallments] = useState('');
  const [isReverseMode, setIsReverseMode] = useState(false);
  const [result, setResult] = useState(null);
  const [calculationError, setCalculationError] = useState('');

  const calculateEMI = (e) => {
    e.preventDefault();
    const enteredAmount = Number(loanAmount);
    const rate = Number(interestRate);
    const count = Number(installments);
    if (
      !loanAmount.trim() ||
      !interestRate.trim() ||
      !installments.trim() ||
      !Number.isFinite(enteredAmount) ||
      enteredAmount <= 0 ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      !Number.isInteger(count) ||
      count <= 0
    ) {
      setCalculationError(t('invalidEMICalculation'));
      return;
    }

    const calculatedLoanAmount = isReverseMode
      ? calculateLoanAmountFromHand(enteredAmount)
      : enteredAmount;
    const calculatedEmi = calculateEmi(
      calculatedLoanAmount,
      rate,
      count,
      100,
      isReverseMode ? 'up' : 'nearest',
    );
    if (calculatedLoanAmount === null || calculatedEmi === null) {
      setCalculationError(t('invalidEMICalculation'));
      return;
    }

    setCalculationError('');
    setResult({
      loanAmount: calculatedLoanAmount,
      emi: calculatedEmi,
      handAmount: calculateAmountInHand(calculatedLoanAmount),
    });
  };

  const toggleCalculationMode = () => {
    setIsReverseMode((current) => !current);
    setLoanAmount('');
    setResult(null);
    setCalculationError('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="card glass p-8">
        <form onSubmit={calculateEMI} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="relative mb-2 flex h-6 items-center">
                <label htmlFor="emi-calculator-amount" className="block pr-12 text-sm font-medium text-slate-700">
                  {t(isReverseMode ? 'amountInHand' : 'loanAmount')} (₹)
                </label>
                <button
                  type="button"
                  onClick={toggleCalculationMode}
                  title={t(isReverseMode ? 'switchToForwardCalculation' : 'switchToReverseCalculation')}
                  aria-label={t(isReverseMode ? 'switchToForwardCalculation' : 'switchToReverseCalculation')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                >
                  <ArrowLeftRight size={18} aria-hidden="true" />
                </button>
              </div>
              <input
                id="emi-calculator-amount"
                type="number"
                min="0.01"
                step="0.01"
                className="input-field"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder={isReverseMode ? 'Ex: 40000' : 'Ex: 50000'}
                required
              />
            </div>
            <div>
              <label htmlFor="emi-calculator-interest-rate" className="block text-sm font-medium text-slate-700 mb-2">
                {t('interestRate')} (%)
              </label>
              <input
                id="emi-calculator-interest-rate"
                type="number"
                min="0"
                step="0.1"
                className="input-field"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="Ex: 2.0"
                required
              />
            </div>
            <div>
              <label htmlFor="emi-calculator-installments" className="block text-sm font-medium text-slate-700 mb-2">
                {t('installments')} ({t('months')})
              </label>
              <input
                id="emi-calculator-installments"
                type="number"
                min="1"
                step="1"
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
              {t(isReverseMode ? 'calculateReverseEMI' : 'calculateEMI')}
            </button>
          </div>
          {calculationError && <p className="text-sm text-rose-600" role="alert">{calculationError}</p>}
        </form>

        {result !== null && (
          <div className="mt-8 p-6 bg-gradient-to-r from-teal-50 to-primary-50 border border-t border-primary-100 rounded-xl space-y-6">
            {isReverseMode && (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-slate-700">{t('loanAmount')}</h3>
                </div>
                <div className="text-3xl font-bold text-primary-600 bg-white px-6 py-3 rounded-lg shadow-sm border border-primary-100">
                  ₹ {Number(result.loanAmount).toLocaleString('en-IN')}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-700">{t('emiAmount')}</h3>
                <p className="text-sm text-slate-500">{t('fixedMonthlyInstallment')}</p>
              </div>
              <div className="text-3xl font-bold text-primary-600 bg-white px-6 py-3 rounded-lg shadow-sm border border-primary-100">
                ₹ {Number(result.emi).toLocaleString('en-IN')}
              </div>
            </div>
            {!isReverseMode && (
              <div className="flex items-center justify-between bg-white px-6 py-4 rounded-lg shadow-sm border border-slate-200">
                <div>
                  <h3 className="text-lg font-medium text-slate-700">{t('amountInHand')}</h3>
                  <p className="text-sm text-slate-500">{t('afterDeductingCharges')}</p>
                </div>
                <div className="text-3xl font-bold text-slate-800">
                  ₹ {Number(result.handAmount).toLocaleString('en-IN')}
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
