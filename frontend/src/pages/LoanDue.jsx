import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import sln from '../api';
import { formatDate, toDisplayInputDate, parseDisplayDate } from '../utils/dateUtils';
import {
  ArrowLeft,
  Save,
  Calendar,
  CalendarDays,
  Hash,
  IndianRupee,
  AlertCircle,
  Clock,
  CheckCircle2,
  BellRing,
  BellOff,
  RefreshCw,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
const autoSlash = (raw) => {
  let d = raw.replace(/[^0-9]/g, '');
  if (d.length > 8) d = d.slice(0, 8);
  if (d.length > 4) return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
  if (d.length > 2) return d.slice(0, 2) + '/' + d.slice(2);
  return d;
};

// ────────────────────────────────────────────────────────────────────────────

const LoanDue = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loan, setLoan]         = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // ── per-row edit state ────────────────────────────────────────────────────
  // shape: { receivedAmount, receiptNo, penalty, penaltyEnabled, paidDate, status }
  const [editValues, setEditValues] = useState({});

  // ── due-date cascade state ────────────────────────────────────────────────
  const [firstDueDate, setFirstDueDate]         = useState('');   // dd/mm/yyyy of first unpaid installment
  const [displayDueDates, setDisplayDueDates]   = useState({});   // { paymentId: 'dd/mm/yyyy' }
  const [dueDatesModified, setDueDatesModified] = useState(false);
  const [savingDues, setSavingDues]             = useState(false);

  // ── calendar picker refs ──────────────────────────────────────────────────
  const paidDatePickerRef  = useRef(null);   // single hidden input for all rows
  const dueDatePickerRef   = useRef(null);   // hidden input for first-due-date picker
  const activePaidId       = useRef(null);   // which row's paidDate is being picked

  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const [loanRes, paymentsRes] = await Promise.all([
          sln.get('/loans'),
          sln.get(`/loans/${id}/payments`),
        ]);

        const currentLoan = loanRes.data.find(l => l._id === id);
        setLoan(currentLoan);

        const data = paymentsRes.data;
        setPayments(data);

        // Build edit values — paidDate empty for unsaved pending rows
        const vals = {};
        data.forEach(p => {
          const isPending  = p.status === 'pending';
          const isOverdue  = p.status === 'overdue';
          const wasRecorded = p.receivedAmount > 0 || p.receiptNo;

          vals[p._id] = {
            receivedAmount : (!isPending && !isOverdue) ? (p.receivedAmount || '') : p.amount,
            receiptNo      : p.receiptNo || '',
            penalty        : p.penalty || 900,
            penaltyEnabled : !isPending && !isOverdue ? !!(p.penalty) : false,
            collectionCharges: p.collectionCharges || 1500,
            collectionChargesEnabled: p.collectionChargesEnabled || false,
            // Empty for never-saved pending rows; pre-fill for paid/partial rows
            paidDate       : (isPending || isOverdue) && !wasRecorded
                               ? ''
                               : toDisplayInputDate(p.paidDate || ''),
            status         : p.status,
          };
        });
        setEditValues(vals);

        // Init displayDueDates from DB
        const dd = {};
        data.forEach(p => { dd[p._id] = formatDate(p.dueDate); });
        setDisplayDueDates(dd);

        // Set firstDueDate to the first unpaid payment's dueDate
        const firstUnpaid = data.find(p => p.status === 'pending' || p.status === 'overdue');
        if (firstUnpaid) setFirstDueDate(formatDate(firstUnpaid.dueDate));

      } catch (err) {
        console.error('Failed to fetch ledger', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [id]);

  // ─── helpers ──────────────────────────────────────────────────────────────
  const setField = (pId, field, value) =>
    setEditValues(prev => ({ ...prev, [pId]: { ...prev[pId], [field]: value } }));

  // ─── due-date cascade ─────────────────────────────────────────────────────
  const handleFirstDueDateChange = (raw) => {
    const formatted = autoSlash(raw);
    setFirstDueDate(formatted);

    const iso = parseDisplayDate(formatted);
    if (!iso) return;

    const base = new Date(iso + 'T00:00:00');

    // Cascade monthly for all unpaid payments in order
    const unpaid = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
    const next   = { ...displayDueDates };
    unpaid.forEach((p, idx) => {
      const d = new Date(base);
      d.setMonth(base.getMonth() + idx);
      next[p._id] = toDisplayInputDate(d);
    });
    setDisplayDueDates(next);
    setDueDatesModified(true);
  };

  const handleSaveDueDates = async () => {
    const iso = parseDisplayDate(firstDueDate);
    if (!iso) return alert('Enter a valid first due date (dd/mm/yyyy)');
    setSavingDues(true);
    try {
      const { data } = await sln.put(`/loans/${id}/recalculate-dues`, { firstDueDate: iso });
      setPayments(data);
      const dd = {};
      data.forEach(p => { dd[p._id] = formatDate(p.dueDate); });
      setDisplayDueDates(dd);
      setDueDatesModified(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save due dates');
    } finally {
      setSavingDues(false);
    }
  };

  // ─── save payment row ─────────────────────────────────────────────────────
  const handleUpdatePayment = async (pId) => {
    setUpdatingId(pId);
    try {
      const vals = editValues[pId];
      const paidDateISO = parseDisplayDate(vals.paidDate) || new Date().toISOString().split('T')[0];

      const dueAmount = payments.find(p => p._id === pId).amount;
      const recAmount = parseFloat(vals.receivedAmount) || 0;

      let newStatus = 'pending';
      if (recAmount >= dueAmount) newStatus = 'paid';
      else if (recAmount > 0)     newStatus = 'partially_paid';

      const { data } = await sln.put(`/loans/payments/${pId}`, {
        ...vals,
        paidDate      : paidDateISO,
        receivedAmount: recAmount,
        penalty       : vals.penaltyEnabled ? (parseFloat(vals.penalty) || 0) : 0,
        collectionCharges: vals.collectionChargesEnabled ? (parseFloat(vals.collectionCharges) || 0) : 0,
        collectionChargesEnabled: vals.collectionChargesEnabled,
        status        : newStatus,
      });

      setPayments(prev => prev.map(p => p._id === pId ? data : p));
      setEditValues(prev => ({
        ...prev,
        [pId]: {
          ...prev[pId],
          paidDate: toDisplayInputDate(data.paidDate || paidDateISO),
          status  : data.status,
        },
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update payment');
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── calendar picker logic ────────────────────────────────────────────────
  const openPaidDatePicker = (pId) => {
    activePaidId.current = pId;
    setTimeout(() => {
      try   { paidDatePickerRef.current?.showPicker(); }
      catch { paidDatePickerRef.current?.click();      }
    }, 30);
  };

  const openDueDatePicker = () => {
    setTimeout(() => {
      try   { dueDatePickerRef.current?.showPicker(); }
      catch { dueDatePickerRef.current?.click();      }
    }, 30);
  };

  // ─── loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
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

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* ── Hidden single date pickers ── */}
      <input
        type="date"
        ref={paidDatePickerRef}
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', top: 0, left: 0, width: 1, height: 1 }}
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.value && activePaidId.current) {
            setField(activePaidId.current, 'paidDate', toDisplayInputDate(new Date(e.target.value + 'T00:00:00')));
          }
        }}
      />
      <input
        type="date"
        ref={dueDatePickerRef}
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', top: 0, left: 0, width: 1, height: 1 }}
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.value) {
            const [y, m, d] = e.target.value.split('-');
            handleFirstDueDateChange(`${d}/${m}/${y}`);
          }
        }}
      />

      {/* ── Header (HP+Customer Left, Cascade Centre, Stats Right) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        
        {/* Left — title + loan info */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/loans')} className="p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-colors shadow-sm">
            <ArrowLeft size={18} />
          </button>
          <div className="border-l border-slate-100 pl-4">
            <p className="text-slate-500 text-xs font-medium">
              HP No: <span className="text-slate-800 font-bold">{loan.hpNumber}</span> •{' '}
              Customer: <span className="text-slate-800 font-bold">{loan.customerReference?.name}</span>
            </p>
          </div>
        </div>

        {/* Centre — First Due Date cascade */}
        <div className="flex flex-col items-center gap-1 bg-slate-50/50 px-4 py-1.5 rounded-xl border border-slate-100/50">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
            First Due Date <span className="text-slate-300 normal-case font-normal">(cascades all pending)</span>
          </p>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              maxLength={10}
              value={firstDueDate}
              onChange={(e) => handleFirstDueDateChange(e.target.value)}
              className="w-28 px-2 py-1 text-xs font-mono tracking-wider rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
            />
            <button
              type="button"
              title="Pick from calendar"
              onClick={openDueDatePicker}
              className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-primary-600 hover:border-primary-300 hover:bg-white transition-all shadow-sm"
            >
              <CalendarDays size={13} />
            </button>
            {dueDatesModified && (
              <button
                onClick={handleSaveDueDates}
                disabled={savingDues}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500 text-white text-[9px] font-bold hover:bg-rose-600 transition-all disabled:opacity-50 shadow-sm"
              >
                {savingDues
                  ? <><RefreshCw size={10} className="animate-spin" /> Saving…</>
                  : <><Save size={10} /> Save Dues</>
                }
              </button>
            )}
          </div>
        </div>

        {/* Right — EMI + Installments stats */}
        <div className="flex gap-3">
          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-center min-w-[90px]">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{t('emiAmount')}</p>
            <p className="text-base font-bold text-primary-600 leading-tight">₹ {loan.emiAmount?.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-center min-w-[90px]">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{t('installments')}</p>
            <p className="text-base font-bold text-slate-800 leading-tight">{loan.installments}</p>
          </div>
        </div>
      </div>

      {/* ── Ledger Table ── */}
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
                <th className="p-4 text-center">{t('penalty')}</th>
                <th className="p-4 text-center">{t('collectionCharges')}</th>
                <th className="p-4 text-center">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => {
                const isPaid      = p.status === 'paid';
                const isUpdating  = updatingId === p._id;
                const ev          = editValues[p._id] || {};
                const recAmount   = parseFloat(ev.receivedAmount) || 0;
                const balance     = Math.max(0, p.amount - recAmount);

                return (
                  <tr key={p._id} className={`${isPaid ? 'bg-emerald-50/30' : ''} transition-colors group`}>

                    {/* No. */}
                    <td className="p-4 text-center text-xs font-bold text-slate-400 border-r border-slate-100 group-hover:bg-slate-50 transition-colors">
                      {p.installmentNumber}.
                    </td>

                    {/* Due Amount */}
                    <td className="p-4">
                      <div className="font-bold text-slate-700">{p.amount.toLocaleString()}</div>
                    </td>

                    {/* Due Date — shows local cascade value */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        {displayDueDates[p._id] || formatDate(p.dueDate)}
                      </div>
                    </td>

                    {/* Received Amount */}
                    <td className="p-4">
                      <div className="relative">
                        <IndianRupee size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          className="w-24 pl-6 pr-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all"
                          value={ev.receivedAmount ?? ''}
                          onChange={(e) => setField(p._id, 'receivedAmount', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </td>

                    {/* Date of Receipt — empty for unsaved pending rows */}
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="dd/mm/yyyy"
                          maxLength={10}
                          className="w-28 px-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 transition-all font-mono text-slate-600 tracking-wider"
                          value={ev.paidDate || ''}
                          onChange={(e) => setField(p._id, 'paidDate', autoSlash(e.target.value))}
                        />
                        <button
                          type="button"
                          title="Pick date"
                          onClick={() => openPaidDatePicker(p._id)}
                          className="p-1.5 rounded-md border border-slate-200 text-slate-400 hover:text-primary-500 hover:border-primary-300 transition-all"
                        >
                          <CalendarDays size={13} />
                        </button>
                      </div>
                    </td>

                    {/* Receipt No. */}
                    <td className="p-4">
                      <div className="relative">
                        <Hash size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          className="w-24 pl-6 pr-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 transition-all"
                          value={ev.receiptNo || ''}
                          onChange={(e) => setField(p._id, 'receiptNo', e.target.value)}
                          placeholder="No."
                        />
                      </div>
                    </td>

                    {/* Penalty toggle + amount */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title={ev.penaltyEnabled ? 'Disable penalty' : 'Enable penalty'}
                          onClick={() => setField(p._id, 'penaltyEnabled', !ev.penaltyEnabled)}
                          className={`p-1.5 rounded-md border transition-all ${
                            ev.penaltyEnabled
                              ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
                              : 'border-slate-200 text-slate-300 hover:text-amber-500 hover:border-amber-300'
                          }`}
                        >
                          {ev.penaltyEnabled ? <BellRing size={13} /> : <BellOff size={13} />}
                        </button>
                        {ev.penaltyEnabled && (
                          <input
                            type="number"
                            className="w-20 px-2 py-1.5 text-sm rounded-lg border border-amber-200 focus:ring-1 focus:ring-amber-400 transition-all"
                            value={ev.penalty ?? 900}
                            onChange={(e) => setField(p._id, 'penalty', e.target.value)}
                            placeholder="900"
                          />
                        )}
                        {!ev.penaltyEnabled && (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>
                    </td>

                    {/* Collection Charges toggle + amount */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          title={ev.collectionChargesEnabled ? 'Disable collection charges' : 'Enable collection charges'}
                          onClick={() => setField(p._id, 'collectionChargesEnabled', !ev.collectionChargesEnabled)}
                          className={`p-1.5 rounded-md border transition-all ${
                            ev.collectionChargesEnabled
                              ? 'bg-rose-50 border-rose-300 text-rose-600 hover:bg-rose-100'
                              : 'border-slate-200 text-slate-300 hover:text-rose-500 hover:border-rose-300'
                          }`}
                        >
                          {ev.collectionChargesEnabled ? <BellRing size={13} /> : <BellOff size={13} />}
                        </button>
                        {ev.collectionChargesEnabled && (
                          <input
                            type="number"
                            className="w-20 px-2 py-1.5 text-sm rounded-lg border border-rose-200 focus:ring-1 focus:ring-rose-400 transition-all font-bold text-rose-600"
                            value={ev.collectionCharges ?? 1500}
                            onChange={(e) => setField(p._id, 'collectionCharges', e.target.value)}
                            placeholder="1500"
                          />
                        )}
                        {!ev.collectionChargesEnabled && (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>
                    </td>

                    {/* Save */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleUpdatePayment(p._id)}
                        disabled={isUpdating}
                        className={`p-2 rounded-lg transition-all shadow-sm flex items-center justify-center mx-auto
                          ${isPaid ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-primary-500 text-white hover:bg-primary-600'}
                          ${isUpdating ? 'opacity-50 animate-pulse' : ''}
                        `}
                      >
                        {isUpdating
                          ? <Clock size={16} className="animate-spin" />
                          : isPaid ? <CheckCircle2 size={16} /> : <Save size={16} />
                        }
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Paid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Partial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
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
