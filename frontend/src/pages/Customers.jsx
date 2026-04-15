import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import sln from '../api';
import { PlusCircle, Search, ArrowUpDown, ArrowUp, ArrowDown, X, AlertCircle } from 'lucide-react';

// Validation helpers
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const VEHICLE_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$/;

const validateMobile = (val) => {
  if (!val) return 'Mobile number is required';
  if (!/^\d+$/.test(val)) return 'Only digits allowed';
  if (!MOBILE_REGEX.test(val)) return 'Must be a 10-digit Indian number (starts with 6-9)';
  return '';
};

const validateVehicle = (val) => {
  if (!val) return 'Vehicle number is required';
  if (!VEHICLE_REGEX.test(val.toUpperCase())) return 'Format: TN24BB3313 (State + District + Series + Number)';
  return '';
};

const SortIcon = ({ field, sortBy, sortOrder }) => {
  if (sortBy !== field) return <ArrowUpDown size={14} className="ml-1 text-slate-400" />;
  return sortOrder === 'asc'
    ? <ArrowUp size={14} className="ml-1 text-primary-600" />
    : <ArrowDown size={14} className="ml-1 text-primary-600" />;
};

const Customers = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Search / Sort state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // Validation errors
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const { data } = await sln.get(`/customers?${params.toString()}`);
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortOrder]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchCustomers(), 300);
    return () => clearTimeout(debounce);
  }, [fetchCustomers]);

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
    if (!name.trim()) newErrors.name = 'Name is required';
    const mErr = validateMobile(mobile);
    if (mErr) newErrors.mobile = mErr;
    if (!address.trim()) newErrors.address = 'Address is required';
    const vErr = validateVehicle(vehicleNumber);
    if (vErr) newErrors.vehicleNumber = vErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await sln.post('/customers', {
        name, mobile, address, vehicleNumber: vehicleNumber.toUpperCase()
      });

      setShowForm(false);
      setName(''); setMobile(''); setAddress(''); setVehicleNumber('');
      setErrors({});
      fetchCustomers();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error adding customer';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(val);
    if (errors.mobile) setErrors(prev => ({ ...prev, mobile: validateMobile(val) }));
  };

  const handleVehicleChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setVehicleNumber(val);
    if (errors.vehicleNumber) setErrors(prev => ({ ...prev, vehicleNumber: validateVehicle(val) }));
  };

  const FieldError = ({ msg }) =>
    msg ? (
      <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
        <AlertCircle size={12} /> {msg}
      </p>
    ) : null;

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
        <h1 className="text-2xl font-bold text-slate-800">{t('customers')}</h1>
        <button
          onClick={() => { setShowForm(!showForm); setErrors({}); }}
          className="btn-primary w-auto flex items-center py-2 px-4 shadow-sm"
        >
          <PlusCircle size={18} className="mr-2" />
          {t('addCustomer')}
        </button>
      </div>

      {/* Add Customer Form */}
      {showForm && (
        <div className="card glass animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">
            {t('addCustomer')}
          </h2>
          <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" noValidate>
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('name')}</label>
              <input
                type="text"
                className={`input-field py-2 ${errors.name ? 'border-red-400 focus:ring-red-300' : ''}`}
                value={name}
                onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: '' })); }}
                placeholder="e.g. Ravi Kumar"
              />
              <FieldError msg={errors.name} />
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('mobileNumber')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">+91</span>
                <input
                  type="tel"
                  className={`input-field py-2 pl-10 ${errors.mobile ? 'border-red-400 focus:ring-red-300' : ''}`}
                  value={mobile}
                  onChange={handleMobileChange}
                  placeholder="9876543210"
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>
              <FieldError msg={errors.mobile} />
              {!errors.mobile && mobile && (
                <p className={`text-xs mt-1 ${mobile.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {mobile.length}/10 digits
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('address')}</label>
              <input
                type="text"
                className={`input-field py-2 ${errors.address ? 'border-red-400 focus:ring-red-300' : ''}`}
                value={address}
                onChange={e => { setAddress(e.target.value); if (errors.address) setErrors(p => ({ ...p, address: '' })); }}
                placeholder="Full address"
              />
              <FieldError msg={errors.address} />
            </div>

            {/* Vehicle Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('vehicleNumber')}</label>
              <input
                type="text"
                className={`input-field py-2 font-mono tracking-widest ${errors.vehicleNumber ? 'border-red-400 focus:ring-red-300' : ''}`}
                value={vehicleNumber}
                onChange={handleVehicleChange}
                placeholder="TN24BB3313"
                maxLength={10}
              />
              <FieldError msg={errors.vehicleNumber} />
              {!errors.vehicleNumber && vehicleNumber && VEHICLE_REGEX.test(vehicleNumber) && (
                <p className="text-xs text-emerald-600 mt-1">✓ Valid format</p>
              )}
            </div>

            <div className="lg:col-span-4 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setErrors({}); setName(''); setMobile(''); setAddress(''); setVehicleNumber(''); }}
                className="py-2 px-5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary w-auto py-2 px-6">
                {submitting ? 'Saving...' : t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input-field py-2 pl-9 pr-8 text-sm"
            placeholder="Search by name, mobile, address or vehicle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="text-slate-500 text-xs">Sort by:</span>
          {[
            { key: 'name', label: 'Name' },
            { key: 'createdAt', label: 'Date' },
            { key: 'mobile', label: 'Mobile' },
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

        <span className="text-xs text-slate-400 ml-auto">{customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Customers Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th
                  className="p-4 font-medium cursor-pointer hover:text-slate-800 select-none"
                  onClick={() => handleSortToggle('name')}
                >
                  <span className="flex items-center">{t('name')} <SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} /></span>
                </th>
                <th
                  className="p-4 font-medium cursor-pointer hover:text-slate-800 select-none"
                  onClick={() => handleSortToggle('mobile')}
                >
                  <span className="flex items-center">{t('mobileNumber')} <SortIcon field="mobile" sortBy={sortBy} sortOrder={sortOrder} /></span>
                </th>
                <th className="p-4 font-medium">{t('address')}</th>
                <th
                  className="p-4 font-medium cursor-pointer hover:text-slate-800 select-none"
                  onClick={() => handleSortToggle('vehicleNumber')}
                >
                  <span className="flex items-center">{t('vehicleNumber')} <SortIcon field="vehicleNumber" sortBy={sortBy} sortOrder={sortOrder} /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="text-slate-300" />
                      <p className="text-slate-500">
                        {search ? `No customers found for "${search}"` : 'No customers found. Add a new customer to get started.'}
                      </p>
                      {search && (
                        <button onClick={() => setSearch('')} className="text-primary-600 text-sm underline">Clear search</button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map(customer => (
                  <tr key={customer._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{customer.name}</td>
                    <td className="p-4 text-slate-600">
                      <span className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">+91</span>
                        {customer.mobile}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 truncate max-w-xs">{customer.address}</td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm font-mono border border-slate-200 tracking-widest">
                        {customer.vehicleNumber}
                      </span>
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

export default Customers;
