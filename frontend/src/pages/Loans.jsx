import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import sln from '../api';
import { 
  PlusCircle, 
  Info, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  X, 
  ChevronDown, 
  AlertCircle,
  Edit2,
  Trash2,
  Table as TableIcon
} from 'lucide-react';

const STATUS_OPTIONS = ['active', 'closed', 'default'];

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed: 'bg-red-100     text-red-700     border-red-200',
  default: 'bg-white       text-slate-600   border-slate-300',
};

const VEHICLE_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$/;

const SortIcon = ({ field, sortBy, sortOrder }) => {
  if (sortBy !== field) return <ArrowUpDown size={13} className="ml-1 text-slate-400" />;
  return sortOrder === 'asc'
    ? <ArrowUp size={13} className="ml-1 text-primary-600" />
    : <ArrowDown size={13} className="ml-1 text-primary-600" />;
};

const Loans = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Search / Filter / Sort
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Inline status change
  const [changingStatus, setChangingStatus] = useState(null);

  // Profile info
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  // Form State — Loan
  const [hpNumber, setHpNumber] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [installments, setInstallments] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [emiManuallyEdited, setEmiManuallyEdited] = useState(false);

  // Form State — Vehicle
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [make, setMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [color, setColor] = useState('');

  // Validation
  const [errors, setErrors] = useState({});

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
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const [loansRes, customersRes] = await Promise.all([
        sln.get(`/loans?${params.toString()}`),
        sln.get('/customers'),
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

  const validateForm = () => {
    const newErrors = {};
    if (!vehicleNumber) {
      newErrors.vehicleNumber = 'Vehicle number is required';
    } else if (!VEHICLE_REGEX.test(vehicleNumber.toUpperCase())) {
      newErrors.vehicleNumber = 'Format: TN24BB3313';
    }
    if (!make.trim()) newErrors.make = 'Make is required';
    if (!vehicleModel.trim()) newErrors.vehicleModel = 'Model is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setHpNumber(''); setCustomerRef(''); setLoanAmount(''); setInterestRate('');
    setInstallments(''); setEmiAmount(''); setEmiManuallyEdited(false);
    setVehicleNumber(''); setMake(''); setVehicleModel(''); setColor('');
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      hpNumber,
      customerReference: customerRef,
      vehicleNumber: vehicleNumber.toUpperCase(),
      make,
      vehicleModel,
      color,
      loanAmount: Number(loanAmount),
      interestRate: Number(interestRate),
      installments: Number(installments),
      emiAmount: emiAmount !== '' ? Number(emiAmount) : Number(autoEmi),
    };

    try {
      if (editingId) {
        await sln.put(`/loans/${editingId}`, payload);
      } else {
        await sln.post('/loans', payload);
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save loan', error);
      alert(error.response?.data?.message || 'Error saving loan');
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this loan and all associated payments?')) return;

    try {
      await sln.delete(`/loans/${id}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting loan');
    }
  };

  const handleEdit = (loan) => {
    setEditingId(loan._id);
    setHpNumber(loan.hpNumber);
    setCustomerRef(loan.customerReference?._id || '');
    setLoanAmount(loan.loanAmount);
    setInterestRate(loan.interestRate);
    setInstallments(loan.installments);
    setEmiAmount(loan.emiAmount);
    setEmiManuallyEdited(true);
    setVehicleNumber(loan.vehicleNumber);
    setMake(loan.make);
    setVehicleModel(loan.vehicleModel);
    setColor(loan.color);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusChange = async (loanId, newStatus) => {
    setChangingStatus(loanId);
    try {
      const { data } = await sln.put(`/loans/${loanId}/status`, { status: newStatus });
      setLoans(prev => prev.map(l => l._id === loanId ? { ...l, status: data.status } : l));
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to update status';
      alert(`Error ${error.response?.status || ''}: ${msg}`);
    } finally {
      setChangingStatus(null);
    }
  };

  const FieldError = ({ msg }) =>
    msg ? (
      <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
        <AlertCircle size={11} /> {msg}
      </p>
    ) : null;

  const handleVehicleNumberChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setVehicleNumber(val);
    if (errors.vehicleNumber) setErrors(p => ({ ...p, vehicleNumber: '' }));
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
          onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className="btn-primary w-auto flex items-center py-2 px-4 shadow-sm"
        >
          {showForm ? <X size={18} className="mr-2" /> : <PlusCircle size={18} className="mr-2" />}
          {showForm ? 'Cancel' : t('createLoan')}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card glass animate-in fade-in slide-in-from-top-4 duration-300 border-t-4 border-t-primary-500">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
            {editingId ? 'Edit Loan' : t('createLoan')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Loan Info */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('loanDetails')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('hpNumber')}</label>
                  <input type="text" className="input-field py-2"
                    value={hpNumber} onChange={e => setHpNumber(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('customers')}</label>
                  <select className="input-field py-2 bg-white"
                    value={customerRef} onChange={e => setCustomerRef(e.target.value)} required>
                    <option value="">Select a Customer</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.name} — {c.mobile}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('loanAmount')} (₹)</label>
                  <input type="number" className="input-field py-2"
                    value={loanAmount} onChange={e => setLoanAmount(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('interestRate')} (%)</label>
                  <input type="number" step="0.1" className="input-field py-2"
                    value={interestRate} onChange={e => setInterestRate(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('installments')}</label>
                  <input type="number" className="input-field py-2"
                    value={installments} onChange={e => setInstallments(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('emiAmount')}</label>
                  <input type="number" step="0.01" className="input-field py-2"
                    value={emiAmount}
                    onChange={e => { setEmiAmount(e.target.value); setEmiManuallyEdited(true); }}
                    placeholder="Auto calculated" />
                </div>
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="border-t border-slate-100 pt-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('vehicleDetails')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('vehicleNumber')}</label>
                  <input
                    type="text"
                    className={`input-field py-2 font-mono tracking-widest ${errors.vehicleNumber ? 'border-red-400 focus:ring-red-300' : ''}`}
                    value={vehicleNumber}
                    onChange={handleVehicleNumberChange}
                    placeholder="TN24BB3313"
                    maxLength={10}
                  />
                  <FieldError msg={errors.vehicleNumber} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('vehicleMake')}</label>
                  <input
                    type="text"
                    className={`input-field py-2 ${errors.make ? 'border-red-400 focus:ring-red-300' : ''}`}
                    value={make}
                    onChange={e => { setMake(e.target.value); if (errors.make) setErrors(p => ({ ...p, make: '' })); }}
                    placeholder="e.g. Honda"
                  />
                  <FieldError msg={errors.make} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('vehicleModel')}</label>
                  <input
                    type="text"
                    className={`input-field py-2 ${errors.vehicleModel ? 'border-red-400 focus:ring-red-300' : ''}`}
                    value={vehicleModel}
                    onChange={e => { setVehicleModel(e.target.value); if (errors.vehicleModel) setErrors(p => ({ ...p, vehicleModel: '' })); }}
                    placeholder="e.g. 01/2026"
                  />
                  <FieldError msg={errors.vehicleModel} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={resetForm} className="py-2 px-5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium">
                Cancel
              </button>
              <button type="submit" className="btn-primary w-auto py-2 px-8">
                {editingId ? 'Update Loan' : t('createLoan')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input-field py-2 pl-9 pr-8 text-sm"
            placeholder="Search HP No., vehicle, customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input-field py-2 pr-8 text-sm bg-white cursor-pointer w-auto"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Loans Table */}
      <div className="card p-0 overflow-hidden shadow-sm border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">{t('hpNumber')}</th>
                <th className="p-4">{t('customers')}</th>
                <th className="p-4">{t('vehicleNumber')}</th>
                <th className="p-4">Loan Info</th>
                <th className="p-4">{t('status')}</th>
                <th className="p-4 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.length === 0 ? (
                <tr><td colSpan="6" className="p-10 text-center text-slate-400">No loans found</td></tr>
              ) : (
                loans.map(loan => (
                  <tr key={loan._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm font-mono tracking-wide">{loan.hpNumber}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{loan.customerReference?.name}</div>
                      <div className="text-xs text-slate-500">+91 {loan.customerReference?.mobile}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-700">{loan.vehicleNumber}</div>
                      <div className="text-xs text-slate-400">{loan.make} {loan.vehicleModel}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-primary-600">₹ {loan.emiAmount?.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">EMI</span></div>
                      <div className="text-[10px] text-slate-500">₹ {loan.loanAmount?.toLocaleString()} Total • {loan.installments} Months</div>
                    </td>
                    <td className="p-4">
                      <select
                        value={loan.status}
                        onChange={e => handleStatusChange(loan._id, e.target.value)}
                        className={`appearance-none px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${STATUS_STYLES[loan.status]}`}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link 
                          to={`/loans/${loan._id}/ledger`}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm border border-emerald-100"
                          title="View Payment Ledger"
                        >
                          <TableIcon size={16} />
                        </Link>
                        <button 
                          onClick={() => handleEdit(loan)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(loan._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
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
