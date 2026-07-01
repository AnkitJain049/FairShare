import React, { useState, useEffect } from 'react';
import { X, DollarSign, Wallet, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export default function SettlePaymentModal({
  isOpen,
  onClose,
  group,
  currentUser,
  membersMap,
  prefilledPayerId = '',
  prefilledReceiverId = '',
  prefilledAmount = '',
  prefilledExpenseId = '',
  expenses = [],
  onSuccess
}) {
  const [payerId, setPayerId] = useState(currentUser.id);
  const [receiverId, setReceiverId] = useState(prefilledReceiverId);
  const [amount, setAmount] = useState(prefilledAmount);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' or 'RAZORPAY'
  const [linkToExpense, setLinkToExpense] = useState(!!prefilledExpenseId);
  const [selectedExpenseId, setSelectedExpenseId] = useState(prefilledExpenseId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-load Razorpay checkout script dynamically if needed
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Update form fields when prefilled properties change
  useEffect(() => {
    if (prefilledPayerId) {
      setPayerId(prefilledPayerId);
    } else {
      setPayerId(currentUser.id);
    }
    if (prefilledReceiverId) setReceiverId(prefilledReceiverId);
    if (prefilledAmount) setAmount(prefilledAmount);
    if (prefilledExpenseId) {
      setSelectedExpenseId(prefilledExpenseId);
      setLinkToExpense(true);
    }
  }, [prefilledPayerId, prefilledReceiverId, prefilledAmount, prefilledExpenseId]);

  if (!isOpen) return null;

  // Filter other group members to be receivers
  const eligibleReceivers = group.memberIds.filter(id => id !== payerId);

  // Filter expenses where payer owes receiver
  const unpaidExpenses = expenses.filter(exp => {
    // Receiver must be the one who paid for the expense
    if (exp.paidById !== receiverId) return false;
    // Payer must be in the split details and owe money
    const payerSplit = exp.splitDetails?.find(s => s.userId === payerId);
    return payerSplit && payerSplit.owedAmount > 0;
  });

  const handleExpenseChange = (expId) => {
    setSelectedExpenseId(expId);
    const exp = expenses.find(e => e.id === expId);
    if (exp) {
      const payerSplit = exp.splitDetails?.find(s => s.userId === payerId);
      if (payerSplit) {
        setAmount(payerSplit.owedAmount.toString());
      }
    }
  };

  const handlePayerChange = (id) => {
    setPayerId(id);
    if (id === receiverId) {
      setReceiverId('');
    }
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const finalReceiverId = payerId !== currentUser.id ? currentUser.id : receiverId;

    if (!finalReceiverId) {
      setError('Please select a receiver.');
      setLoading(false);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount greater than zero.');
      setLoading(false);
      return;
    }

    const relExpenseId = linkToExpense ? selectedExpenseId : null;

    try {
      if (paymentMethod === 'CASH') {
        const payment = await api.payments.recordCash(
          group.id,
          payerId,
          finalReceiverId,
          parseFloat(amount),
          relExpenseId
        );
        
        setLoading(false);
        const requiresApproval = payment.status === 'AWAITING_APPROVAL';
        onSuccess(
          requiresApproval 
            ? 'Cash payment recorded! Awaiting confirmation from recipient.' 
            : 'Cash payment settled successfully!'
        );
      } else {
        // Razorpay Checkout
        if (payerId !== currentUser.id) {
          setError('You can only make online payments for yourself.');
          setLoading(false);
          return;
        }

        const orderDetails = await api.payments.createRazorpayOrder(
          group.id,
          payerId,
          finalReceiverId,
          parseFloat(amount),
          relExpenseId
        );

        if (!window.Razorpay) {
          setError('Razorpay SDK failed to load. Please check your internet connection.');
          setLoading(false);
          return;
        }

        const options = {
          key: orderDetails.keyId,
          amount: orderDetails.amount,
          currency: orderDetails.currency,
          name: 'FairShare',
          description: `Settling balance in ${group.name}`,
          order_id: orderDetails.orderId,
          handler: async function (response) {
            setLoading(true);
            try {
              await api.payments.verifyRazorpayPayment(
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );
              setLoading(false);
              onSuccess('Online payment complete! Awaiting approval from receiver.');
            } catch (verifyErr) {
              setLoading(false);
              setError(verifyErr.message || 'Signature verification failed.');
            }
          },
          prefill: {
            name: currentUser.name,
            email: currentUser.email,
            contact: currentUser.phoneNumber || ''
          },
          theme: {
            color: '#059669' // Emerald-600
          },
          modal: {
            ondismiss: function() {
              setLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to process payment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
          disabled={loading}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold mb-5 flex items-center space-x-2 text-slate-850">
          <DollarSign className="h-6 w-6 text-emerald-600" />
          <span>Record Settlement</span>
        </h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSettle} className="space-y-4">
          {/* Payer Display (Read-Only to enforce payment lock) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payer (Who Paid)</label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm font-semibold select-none">
              {payerId === currentUser.id ? 'You' : (membersMap[payerId]?.name || 'Unknown')}
            </div>
          </div>

          {/* Receiver Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recipient (Who Received)</label>
            {payerId !== currentUser.id ? (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm font-semibold select-none">
                You
              </div>
            ) : (
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-semibold"
                disabled={loading}
                required
              >
                <option value="">Select recipient...</option>
                {eligibleReceivers.map(memberId => (
                  <option key={memberId} value={memberId}>
                    {membersMap[memberId]?.name || 'Unknown'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Settle for Specific Expense Toggle */}
          {receiverId && unpaidExpenses.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Settle for specific expense?</span>
                <input
                  type="checkbox"
                  checked={linkToExpense}
                  onChange={(e) => {
                    setLinkToExpense(e.target.checked);
                    if (!e.target.checked) setSelectedExpenseId('');
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
                  disabled={loading}
                />
              </div>

              {linkToExpense && (
                <select
                  value={selectedExpenseId}
                  onChange={(e) => handleExpenseChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
                  disabled={loading}
                  required
                >
                  <option value="">Select expense...</option>
                  {unpaidExpenses.map(exp => {
                    const split = exp.splitDetails?.find(s => s.userId === payerId);
                    return (
                      <option key={exp.id} value={exp.id}>
                        {exp.description} (₹{split?.owedAmount.toFixed(2)})
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-8 pr-4 text-slate-850 text-base font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                disabled={loading || (linkToExpense && selectedExpenseId)}
                required
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
                disabled={loading}
              >
                <Wallet className="h-5 w-5 mb-1" />
                <span>Manual Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('RAZORPAY')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition-all ${
                  paymentMethod === 'RAZORPAY'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
                disabled={loading || payerId !== currentUser.id}
                title={payerId !== currentUser.id ? "Online payment only available when you are paying" : ""}
              >
                <CreditCard className="h-5 w-5 mb-1" />
                <span>Online (Razorpay)</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-500 shadow-md shadow-emerald-600/10 transition-all flex items-center justify-center space-x-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>
                  {paymentMethod === 'CASH' 
                    ? (payerId === currentUser.id ? 'Record Payment' : 'Record Receipt') 
                    : 'Pay with Razorpay'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
