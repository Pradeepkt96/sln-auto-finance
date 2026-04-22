import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import sln from '../api';
import { formatDate } from '../utils/dateUtils';
import { 
  PlusCircle, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  X, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  ExternalLink 
} from 'lucide-react';

// Validation helpers
const MOBILE_REGEX = /^[6-9]\d{9}$/;

const validateMobile = (val) => {
  if (!val) return 'Mobile number is required';
  if (!/^\d+$/.test(val)) return 'Only digits allowed';
  if (!MOBILE_REGEX.test(val)) return 'Must be a 10-digit Indian number (starts with 6-9)';
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
  const [editingId, setEditingId] = useState(null);

  // Search / Sort state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('slNo');
  const [sortOrder, setSortOrder] = useState('asc');

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [address, setAddress] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState('');

  // Role check
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

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
    if (altMobile && !MOBILE_REGEX.test(altMobile)) {
      newErrors.altMobile = 'Must be a 10-digit Indian number';
    }
    if (!address.trim()) newErrors.address = 'Address is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      let customerRes = null;
      if (editingId) {
        customerRes = (await sln.put(`/customers/${editingId}`, { name, mobile, altMobile, address })).data;
      } else {
        customerRes = (await sln.post('/customers', { name, mobile, altMobile, address })).data;
      }

      // If a photo file was selected, upload it
      if (photoFile && customerRes && customerRes._id) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        try {
          await sln.post(`/customers/${customerRes._id}/photo`, fd);
        } catch (uploadErr) {
          console.error('Photo upload failed', uploadErr);
        }
      }

      resetForm();
      fetchCustomers();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error saving customer';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setPhotoFile(null);
      setPhotoPreview('');
      return;
    }
    setPhotoFile(f);
    const url = URL.createObjectURL(f);
    setPhotoPreview(url);
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this customer? This will also delete all associated loans and payments.')) return;

    try {
      await sln.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting customer');
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer._id);
    setName(customer.name);
    setMobile(customer.mobile);
    setAltMobile(customer.altMobile || '');
    setAddress(customer.address);
    setPhotoPreview(customer.photoUrl || '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setMobile('');
    setAltMobile('');
    setAddress('');
    setPhotoFile(null);
    setPhotoPreview('');
    setErrors({});
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(val);
    if (errors.mobile) setErrors(prev => ({ ...prev, mobile: validateMobile(val) }));
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
    <div className="space-y-4">
      {/* Image lightbox modal */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setLightboxUrl('')}>
          <div className="max-w-[95%] max-h-[95%] p-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightboxUrl('')} className="mb-2 text-white text-sm">Close ✕</button>
            <img src={lightboxUrl} alt="Full size" className="w-full h-full object-contain rounded" />
          </div>
        </div>
      )}
      {/* Form */}

      {/* Form */}
      {showForm && (
        <div className="card glass animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">
            {editingId ? 'Edit Customer' : t('addCustomer')}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4" noValidate>
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
                />
              </div>
              <FieldError msg={errors.mobile} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alt Mobile (Optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">+91</span>
                <input
                  type="tel"
                  className={`input-field py-2 pl-10 ${errors.altMobile ? 'border-red-400 focus:ring-red-300' : ''}`}
                  value={altMobile}
                  onChange={(e) => setAltMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Optional"
                  maxLength={10}
                />
              </div>
              <FieldError msg={errors.altMobile} />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Photo (optional)</label>
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
              {photoPreview && (
                <div className="mt-2 w-24 h-24 rounded overflow-hidden border">
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="md:col-span-3 flex justify-end gap-3 mt-2">
              <button type="button" onClick={resetForm} className="py-2 px-5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary w-auto py-2 px-6 shadow-sm">
                {submitting ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Actions Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input-field py-2 pl-9 pr-8 text-sm"
            placeholder="Search by name, mobile or address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <button
          onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className="btn-primary w-auto flex items-center py-2 px-4 shadow-sm h-10 ml-auto"
        >
          {showForm ? <X size={18} className="mr-2" /> : <PlusCircle size={18} className="mr-2" />}
          {showForm ? 'Cancel' : t('addCustomer')}
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden shadow-sm border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th 
                  className="p-4 w-20 cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSortToggle('slNo')}
                >
                  <div className="flex items-center">
                    Sl. no
                    <SortIcon field="slNo" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </th>
                <th 
                  className="p-4 cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSortToggle('name')}
                >
                  <div className="flex items-center">
                    {t('name')}
                    <SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </th>
                <th className="p-4">{t('mobileNumber')}</th>
                <th className="p-4">{t('address')}</th>
                <th 
                  className="p-4 cursor-pointer hover:text-primary-600 transition-colors"
                  onClick={() => handleSortToggle('loanNumbers')}
                >
                  <div className="flex items-center">
                    Loan Nos.
                    <SortIcon field="loanNumbers" sortBy={sortBy} sortOrder={sortOrder} />
                  </div>
                </th>
                <th className="p-4 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-slate-400">No customers found</td>
                </tr>
              ) : (
                customers.map((customer, index) => (
                  <tr key={customer._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 text-sm text-slate-400 font-bold">{customer.slNo || index + 1}</td>
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                        {customer.photoUrl ? (
                          <img
                            src={customer.photoUrl}
                            alt={customer.name}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setLightboxUrl(customer.photoUrl)}
                          />
                        ) : (
                          <div className="text-slate-400 text-xs">No Photo</div>
                        )}
                      </div>
                      <div>{customer.name}</div>
                    </td>
                    <td className="p-4 text-sm">
                      <div>{customer.mobile}</div>
                      {customer.altMobile && (
                        <div className="text-[10px] text-slate-400 font-medium">Alt: {customer.altMobile}</div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600 max-w-xs truncate">{customer.address}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {customer.loanNumbers && customer.loanNumbers.length > 0 ? (
                          customer.loanNumbers.map((loanObj) => (
                            <Link 
                              key={loanObj.hpNumber} 
                              to={`/loans?search=${loanObj.hpNumber}`}
                              className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors"
                            >
                              {loanObj.hpNumber} {loanObj.hpaDate ? `(${formatDate(loanObj.hpaDate)})` : ''} <ExternalLink size={8} className="ml-1" />
                            </Link>
                          ))
                        ) : (
                          <span className="text-slate-300 text-[10px]">No active loans</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(customer)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(customer._id)}
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

export default Customers;
