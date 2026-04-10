import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { PlusCircle, Info, Search, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronDown } from 'lucide-react';

const STATUS_OPTIONS = ['active', 'closed', 'default'];

const STATUS_STYLES = {
  active:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed:  'bg-red-100     text-red-700     border-red-200',
  default: 'bg-white       text-slate-600   border-slate-300',
};

const SortIcon = ({ field, sortBy, sortOrder }) => {
  if (sortBy !== field) return <ArrowUpDown size={13} className="ml-1 text-slate-400" />;
  return sortOrder === 'asc'
    ? <ArrowUp size={13} className="ml-1 text-primary-600" />
    : <ArrowDown size={13} className="ml-1 text-primary-600" />;
};

const Loans = () => {
  const { t } = useTranslation();
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Search / Filter / Sort
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Inline status change
  const [changingStatus, setChangingStatus] = useState(null); // loan id being changed

  // Form State
  const [hpNumber, setHpNumber] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [installments, setInstallments] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [emiManuallyEdited, setEmiManuallyEdited] = useState(false);

  const roundToNearestHundred = (value) => Math.round(value / 100) * 100;

  const getAutoEmi = () => {
    if (!loanAmount || !interestRate || !installments) return '';
    const p = parseFloat(loanAmount);
    const r = parseFloat(interestRate) / 100;
    const n = parseInt(installments, 10);
    if (!p || !n) return '';
    const emi = (p * r) + p / n;
    const roundedEmi = roundToNearestHundred(emi);
    return isNaN(roundedEmi) ? '' : roundedEmi.toFixed(2);
  };

  const autoEmi = getAutoEmi();

  useEffect(() => {
    const autoValue = getAutoEmi();
    if (!emiManuallyEdited) setEmiAmount(autoValue);
  }, [loanAmount, interestRate, installments]);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const [loansRes, customersRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/loans?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/customers', {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);
      setLoans(loansRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(debounce);
  }, [fetchData]);

  const handleSortToggle = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/loans', {
        hpNumber,
        customerReference: customerRef,
        loanAmount: Number(loanAmount),
        interestRate: Number(interestRate),
        installments: Number(installments),
        emiAmount: emiAmount !== '' ? Number(emiAmount) : Number(autoEmi),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowForm(false);
      setHpNumber(''); setCustomerRef(''); setLoanAmount(''); setInterestRate('');
      setInstallments(''); setEmiAmount(''); setEmiManuallyEdited(false);
      fetchData();
    } catch (error) {
      console.error('Failed to create loan', error);
      alert(error.response?.data?.message || 'Error creating loan');
    }
  };

  const handleStatusChange = async (loanId, newStatus) => {
    setChangingStatus(loanId);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put(
        `http://localhost:5000/api/loans/${loanId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLoans(prev => prev.map(l => l._id === loanId ? { ...l, status: data.status } : l));
    } catch (error) {
      console.error('Status update error:', error.response?.status, error.response?.data, error.message);
      const msg = error.response?.data?.message || error.message || 'Failed to update status';
      alert(`Error ${error.response?.status || ''}: ${msg}`);
    } finally {
      setChangingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800">{t('loans')}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary w-auto flex items-center py-2 px-4 shadow-sm"
        >
          <PlusCircle size={18} className="mr-2" />
          {t('createLoan')}
        </button>
      </div>

      {/* Create Loan Form */}
      {showForm && (
        <div className="card glass animate-in fade-in slide-in-from-top-4 duration-300 border-t-4 border-t-primary-500">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">
            {t('createLoan')}
          </h2>
          <form onSubmit={handleCreateLoan} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('hpNumber')}</label>
              <input
                type="text" className="input-field py-2"
                value={hpNumber} onChange={e => setHpNumber(e.target.value)} required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
              <select
                className="input-field py-2 bg-white"
                value={customerRef} onChange={e => setCustomerRef(e.target.value)} required
              >
                <option value="">Select a Customer</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.name} — {c.mobile}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('loanAmount')}</label>
              <input
                type="number" className="input-field py-2"
                value={loanAmount} onChange={e => setLoanAmount(e.target.value)} required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('interestRate')} (%)</label>
              <input
                type="number" step="0.1" className="input-field py-2"
                value={interestRate} onChange={e => setInterestRate(e.target.value)} required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('installments')}</label>
              <input
                type="number" className="input-field py-2"
                value={installments} onChange={e => setInstallments(e.target.value)} required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Auto EMI</label>
              <input
                type="number" step="0.01" className="input-field py-2"
                value={emiAmount}
                onChange={e => { setEmiAmount(e.target.value); setEmiManuallyEdited(true); }}
                placeholder="Auto calculated EMI"
              />
              <p className="text-xs text-slate-500 mt-1">
                Auto-filled from (p × r) + p / n, editable before save.
              </p>
            </div>
            <div className="lg:col-span-3 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="py-2 px-5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary w-auto py-2 px-8">
                {t('createLoan')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search, Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input-field py-2 pl-9 pr-8 text-sm"
            placeholder="Search by HP No., customer name or mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            className="input-field py-2 pr-8 text-sm bg-white appearance-none cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 text-xs">Sort:</span>
          {[
            { key: 'createdAt', label: 'Date' },
            { key: 'loanAmount', label: 'Amount' },
            { key: 'emiAmount', label: 'EMI' },
            { key: 'installments', label: 'Months' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => handleSortToggle(s.key)}
              className={`flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
                ${sortBy === s.key ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              {s.label}
              <SortIcon field={s.key} sortBy={sortBy} sortOrder={sortOrder} />
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 ml-auto">{loans.length} loan{loans.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Loans Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-medium">{t('hpNumber')}</th>
                <th className="p-4 font-medium">Customer</th>
                <th
                  className="p-4 font-medium cursor-pointer hover:text-slate-800 select-none"
                  onClick={() => handleSortToggle('loanAmount')}
                >
                  <span className="flex items-center">
                    {t('loanAmount')} <SortIcon field="loanAmount" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </th>
                <th
                  className="p-4 font-medium cursor-pointer hover:text-slate-800 select-none"
                  onClick={() => handleSortToggle('installments')}
                >
                  <span className="flex items-center">
                    {t('installments')} <SortIcon field="installments" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </th>
                <th
                  className="p-4 font-medium cursor-pointer hover:text-slate-800 select-none"
                  onClick={() => handleSortToggle('emiAmount')}
                >
                  <span className="flex items-center">
                    EMI <SortIcon field="emiAmount" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </th>
                <th className="p-4 font-medium">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Info className="text-slate-300" size={32} />
                      <p className="text-slate-500">
                        {search || filterStatus
                          ? 'No loans match your search/filter.'
                          : 'No loans created yet. Create one above.'}
                      </p>
                      {(search || filterStatus) && (
                        <button
                          onClick={() => { setSearch(''); setFilterStatus(''); }}
                          className="text-primary-600 text-sm underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                loans.map(loan => (
                  <tr key={loan._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm font-mono tracking-wide">
                        {loan.hpNumber}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{loan.customerReference?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">+91 {loan.customerReference?.mobile}</div>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">₹ {loan.loanAmount?.toLocaleString()}</td>
                    <td className="p-4 text-slate-600">{loan.installments} months</td>
                    <td className="p-4 font-semibold text-primary-600">₹ {loan.emiAmount?.toLocaleString()}</td>
                    <td className="p-4">
                      {/* Admin Status Change Dropdown */}
                      <div className="relative inline-block">
                        <select
                          value={loan.status}
                          disabled={changingStatus === loan._id}
                          onChange={e => handleStatusChange(loan._id, e.target.value)}
                          className={`appearance-none pr-6 pl-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border cursor-pointer transition-all
                            ${STATUS_STYLES[loan.status]}
                            ${changingStatus === loan._id ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown
                          size={10}
                          className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-60"
                        />
                        {changingStatus === loan._id && (
                          <span className="absolute -right-5 top-1/2 -translate-y-1/2">
                            <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Loans;
