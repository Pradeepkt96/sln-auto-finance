import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import sln from '../api';
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  Hash, 
  IndianRupee, 
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';

const LoanDue = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loan, setLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Local state for editing fields
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const [loanRes, paymentsRes] = await Promise.all([
          sln.get(`/loans`), // We fetch all then find because individual get might not be implemented yet
          sln.get(`/loans/${id}/payments`)
        ]);
        
        const currentLoan = loanRes.data.find(l => l._id === id);
        setLoan(currentLoan);
        setPayments(paymentsRes.data);

        // Initialize edit values
        const vals = {};
        paymentsRes.data.forEach(p => {
          vals[p._id] = {
            receivedAmount: p.receivedAmount || '',
            receiptNo: p.receiptNo || '',
            penalty: p.penalty || '',
            paidDate: p.paidDate ? new Date(p.paidDate).toISOString().split('T')[0] : '',
            status: p.status
          };
        });
        setEditValues(vals);
      } catch (error) {
        console.error('Failed to fetch ledger', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, [id]);

  const handleInputChange = (pId, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [pId]: {
        ...prev[pId],
        [field]: value
      }
    }));
  };

  const handleUpdatePayment = async (pId) => {
    setUpdatingId(pId);
    try {
      const vals = editValues[pId];
      
      // Determine status based on received amount
      const dueAmount = payments.find(p => p._id === pId).amount;
      const recAmount = parseFloat(vals.receivedAmount) || 0;
      
      let newStatus = 'pending';
      if (recAmount >= dueAmount) newStatus = 'paid';
      else if (recAmount > 0) newStatus = 'partially_paid';

      const { data } = await sln.put(`/loans/payments/${pId}`, {
        ...vals,
        receivedAmount: recAmount,
        penalty: parseFloat(vals.penalty) || 0,
        status: newStatus
      });

      // Update local payments state
      setPayments(prev => prev.map(p => p._id === pId ? data : p));
      
      // Show success briefly or just rely on state update
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update payment');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="text-center p-10">
        <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Loan Not Found</h2>
        <button onClick={() => navigate('/loans')} className="mt-4 text-primary-600 underline">Back to Loans</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/loans')}
            className="p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t('loanDue')} Tracking</h1>
            <p className="text-slate-500 text-sm font-medium">
              HP No: <span className="text-slate-800 font-bold">{loan.hpNumber}</span> • 
              Customer: <span className="text-slate-800 font-bold">{loan.customerReference?.name}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('emiAmount')}</p>
            <p className="text-lg font-bold text-primary-600">₹ {loan.emiAmount?.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('installments')}</p>
            <p className="text-lg font-bold text-slate-800">{loan.installments}</p>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card p-0 overflow-hidden shadow-sm border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark-bg text-dark-text text-[10px] font-bold uppercase tracking-widest">
                <th className="p-4 w-12 text-center text-slate-400 border-r border-slate-800">No.</th>
                <th className="p-4">{t('dueAmount')}</th>
                <th className="p-4">{t('dueDate')}</th>
                <th className="p-4">{t('receivedAmount')}</th>
                <th className="p-4">{t('dateOfReceipt')}</th>
                <th className="p-4">{t('receiptNo')}</th>
                <th className="p-4">{t('penalty')}</th>
                <th className="p-4">{t('balanceAmount')}</th>
                <th className="p-4 text-center">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p, idx) => {
                const isPaid = p.status === 'paid';
                const isPending = p.status === 'pending';
                const isUpdating = updatingId === p._id;
                const balance = Math.max(0, p.amount - (parseFloat(editValues[p._id]?.receivedAmount) || 0));

                return (
                  <tr key={p._id} className={`${isPaid ? 'bg-emerald-50/30' : ''} transition-colors group`}>
                    <td className="p-4 text-center text-xs font-bold text-slate-400 border-r border-slate-100 group-hover:bg-slate-50 transition-colors">
                      {p.installmentNumber}.
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-700">₹ {p.amount.toLocaleString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <Calendar size={12} className="text-slate-400" />
                        {new Date(p.dueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="relative">
                        <IndianRupee size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="number" 
                          className="w-24 pl-6 pr-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                          value={editValues[p._id]?.receivedAmount}
                          onChange={(e) => handleInputChange(p._id, 'receivedAmount', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <input 
                        type="date" 
                        className="w-36 px-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 transition-all font-medium text-slate-600"
                        value={editValues[p._id]?.paidDate}
                        onChange={(e) => handleInputChange(p._id, 'paidDate', e.target.value)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="relative">
                        <Hash size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          className="w-24 pl-6 pr-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 transition-all"
                          value={editValues[p._id]?.receiptNo}
                          onChange={(e) => handleInputChange(p._id, 'receiptNo', e.target.value)}
                          placeholder="No."
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        className="w-20 px-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 transition-all"
                        value={editValues[p._id]?.penalty}
                        onChange={(e) => handleInputChange(p._id, 'penalty', e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-4">
                      <div className={`text-sm font-bold ${balance > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        ₹ {balance.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleUpdatePayment(p._id)}
                        disabled={isUpdating}
                        className={`p-2 rounded-lg transition-all shadow-sm flex items-center justify-center mx-auto
                          ${isPaid ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-primary-500 text-white hover:bg-primary-600'}
                          ${isUpdating ? 'opacity-50 animate-pulse' : ''}
                        `}
                      >
                        {isUpdating ? <Clock size={16} className="animate-spin" /> : (isPaid ? <CheckCircle2 size={16} /> : <Save size={16} />)}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Paid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pending</span>
          </div>
        </div>
        <button 
          onClick={() => window.print()} 
          className="text-xs font-bold text-primary-600 border border-primary-200 bg-primary-50 px-6 py-2 rounded-xl hover:bg-primary-100 transition-all shadow-sm uppercase tracking-widest"
        >
          Print Ledger
        </button>
      </div>
    </div>
  );
};

export default LoanDue;
