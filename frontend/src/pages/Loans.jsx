import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import sln from '../api';
import { formatDate, toDisplayInputDate, parseDisplayDate } from '../utils/dateUtils';
import {
  PlusCircle,
  Info,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Table as TableIcon,
  CalendarDays,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Bell,
  ChevronDown as ChevronDownIcon,
  AlertCircle,
  Edit2,
  Trash2,
} from 'lucide-react';

const STATUS_OPTIONS = ['active', 'closed', 'reloan', 'collection'];

const STATUS_STYLES = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 size={12} />, label: 'Active' },
  closed: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: <XCircle size={12} />, label: 'Closed' },
  reloan: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: <RefreshCcw size={12} />, label: 'Reloan' },
  collection: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Bell size={12} />, label: 'Collection' },
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
  const [searchHpNumber, setSearchHpNumber] = useState('');
  const [searchHpaDate, setSearchHpaDate] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchVehicle, setSearchVehicle] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('hpNumber');
  const [sortOrder, setSortOrder] = useState('asc');

  // Inline status change
  const [changingStatus, setChangingStatus] = useState(null);
  const [activePickerId, setActivePickerId] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActivePickerId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Profile info
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  // Form State — Loan
  const [hpNumber, setHpNumber] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('2');
  const [installments, setInstallments] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [emiManuallyEdited, setEmiManuallyEdited] = useState(false);
  const [hpaDate, setHpaDate] = useState('');
  const hpaDatePickerRef = useRef(null);

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
      if (searchHpNumber) params.append('hpNumber', searchHpNumber);
      if (searchHpaDate) params.append('hpaDate', searchHpaDate);
      if (searchCustomer) params.append('customer', searchCustomer);
      if (searchVehicle) params.append('vehicleNumber', searchVehicle);
      
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
  }, [searchHpNumber, searchHpaDate, searchCustomer, searchVehicle, filterStatus, sortBy, sortOrder]);

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
    if (!hpaDate) {
      newErrors.hpaDate = 'HPA Date is required';
    } else if (!parseDisplayDate(hpaDate)) {
      newErrors.hpaDate = 'Enter a valid date (dd/mm/yyyy)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setHpNumber(''); setCustomerRef(''); setLoanAmount(''); setInterestRate('2');
    setInstallments(''); setEmiAmount(''); setEmiManuallyEdited(false);
    setVehicleNumber(''); setMake(''); setVehicleModel(''); setColor('');
    setHpaDate('');
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const isoHpaDate = parseDisplayDate(hpaDate); // convert dd/mm/yyyy → yyyy-mm-dd
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
      hpaDate: isoHpaDate,
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
    setHpaDate(toDisplayInputDate(loan.hpaDate));
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

  // Auto-insert slashes to keep dd/mm/yyyy format as the user types
  const handleHpaDateChange = (e) => {
    let raw = e.target.value.replace(/[^0-9]/g, ''); // digits only
    if (raw.length > 8) raw = raw.slice(0, 8);
    let formatted = raw;
    if (raw.length > 4) formatted = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
    else if (raw.length > 2) formatted = raw.slice(0, 2) + '/' + raw.slice(2);
    setHpaDate(formatted);
    if (errors.hpaDate) setErrors(p => ({ ...p, hpaDate: '' }));
  };

  // Auto-insert slashes for mm/yyyy
  const handleModelChange = (e) => {
    let raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw.length > 6) raw = raw.slice(0, 6);
    let formatted = raw;
    if (raw.length > 2) formatted = raw.slice(0, 2) + '/' + raw.slice(2);
    setVehicleModel(formatted);
    if (errors.vehicleModel) setErrors(p => ({ ...p, vehicleModel: '' }));
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Form */}

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
                  <label className="block text-sm font-medium text-slate-700 mb-1">HPA Date</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="dd/mm/yyyy"
                      maxLength={10}
                      className={`input-field py-2 font-mono tracking-wider flex-1 ${errors.hpaDate ? 'border-red-400 focus:ring-red-300' : ''}`}
                      value={hpaDate}
                      onChange={handleHpaDateChange}
                    />
                    {/* Hidden native date picker triggered by calendar icon */}
                    <input
                      type="date"
                      ref={hpaDatePickerRef}
                      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
                      tabIndex={-1}
                      onChange={(e) => {
                        if (e.target.value) {
                          setHpaDate(toDisplayInputDate(new Date(e.target.value + 'T00:00:00')));
                          if (errors.hpaDate) setErrors(p => ({ ...p, hpaDate: '' }));
                        }
                      }}
                    />
                    <button
                      type="button"
                      title="Pick from calendar"
                      onClick={() => { try { hpaDatePickerRef.current?.showPicker(); } catch { hpaDatePickerRef.current?.click(); } }}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50 transition-all"
                    >
                      <CalendarDays size={16} />
                    </button>
                  </div>
                  <FieldError msg={errors.hpaDate} />
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
                    inputMode="numeric"
                    className={`input-field py-2 ${errors.vehicleModel ? 'border-red-400 focus:ring-red-300' : ''}`}
                    value={vehicleModel}
                    onChange={handleModelChange}
                    placeholder="mm/yyyy"
                    maxLength={7}
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

      {/* Search & Filter & Create */}
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input-field py-2 pl-8 pr-2 text-xs h-full"
              placeholder="HP No..."
              value={searchHpNumber}
              onChange={e => setSearchHpNumber(e.target.value)}
            />
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input-field py-2 pl-8 pr-2 text-xs h-full"
              placeholder="HPA Date (dd/mm/yyyy)..."
              value={searchHpaDate}
              onChange={e => setSearchHpaDate(e.target.value)}
            />
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input-field py-2 pl-8 pr-2 text-xs h-full"
              placeholder="Customer Name/Mobile..."
              value={searchCustomer}
              onChange={e => setSearchCustomer(e.target.value)}
            />
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input-field py-2 pl-8 pr-2 text-xs h-full"
              placeholder="Vehicle No/Make/Model..."
              value={searchVehicle}
              onChange={e => setSearchVehicle(e.target.value)}
            />
          </div>
          <button
            onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
            className="btn-primary w-full flex items-center justify-center py-2 px-4 shadow-sm"
          >
            {showForm ? <X size={16} className="mr-2" /> : <PlusCircle size={16} className="mr-2" />}
            {showForm ? 'Cancel' : t('createLoan')}
          </button>
        </div>
      </div>



      {/* Loans Table */}
      <div className="card p-0 overflow-hidden shadow-sm border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th
                  className="p-4 cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSortToggle('hpNumber')}
                >
                  <div className="flex items-center">
                    {t('hpNumber')}
                    <SortIcon field="hpNumber" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSortToggle('hpaDate')}
                >
                  <div className="flex items-center">
                    HPA Date
                    <SortIcon field="hpaDate" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSortToggle('customerReference')}
                >
                  <div className="flex items-center">
                    {t('customers')}
                    <SortIcon field="customerReference" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </th>
                <th className="p-4">{t('vehicleNumber')}</th>
                <th
                  className="p-4 cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSortToggle('loanAmount')}
                >
                  <div className="flex items-center">
                    Loan Info
                    <SortIcon field="loanAmount" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSortToggle('status')}
                >
                  <div className="flex items-center">
                    {t('status')}
                    <SortIcon field="status" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </th>
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
                      <div className="text-sm text-slate-600">{formatDate(loan.hpaDate)}</div>
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
                    <td className="p-4 relative" ref={activePickerId === loan._id ? dropdownRef : null}>
                      {
                        (()=>{
                          const style = STATUS_STYLES[loan.status] || STATUS_STYLES.active;
                          return (
                            <button
                              onClick={() => setActivePickerId(activePickerId === loan._id ? null : loan._id)}
                              disabled={changingStatus === loan._id}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all shadow-sm
                                ${style.bg} ${style.text} ${style.border}
                                hover:shadow-md active:scale-95 disabled:opacity-50
                              `}
                            >
                              {style.icon}
                              <span>{loan.status || 'unknown'}</span>
                              <ChevronDownIcon size={12} className={`transition-transform duration-200 ${activePickerId === loan._id ? 'rotate-180' : ''}`} />
                            </button>
                          );
                        })()
                      }

                      {activePickerId === loan._id && (
                        <div className="absolute top-12 left-4 z-[100] w-40 bg-white rounded-xl shadow-xl border border-slate-100 p-1 animate-in fade-in zoom-in-95 duration-150">
                          {STATUS_OPTIONS.map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                handleStatusChange(loan._id, s);
                                setActivePickerId(null);
                              }}
                              className={`flex items-center gap-3 w-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors
                                ${loan.status === s ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
                              `}
                            >
                              <span className={STATUS_STYLES[s].text}>{STATUS_STYLES[s].icon}</span>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
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
