import React from 'react';
import { Calendar, Edit, Trash2 } from 'lucide-react';

export default function ExpenseCard({ 
  expense, 
  membersMap, 
  onEdit, 
  onDelete, 
  currentUser, 
  payments = [], 
  allExpenses = [],
  onSettleExpenseShare 
}) {
  const paidByName = membersMap[expense.paidById]?.name || 'Unknown';
  
  const isPayer = expense.paidById === currentUser?.id;
  const userSplit = expense.splitDetails?.find(s => s.userId === currentUser?.id);
  const owesAmount = userSplit ? userSplit.owedAmount : 0;

  // Helper to determine split settlement status using FIFO chronological logic
  const getUserSplitStatus = (debtorId, creditorId) => {
    // 1. Get all expenses in group where creditorId paid and debtorId owes money, sorted chronologically
    const debtorDebts = allExpenses
      .filter(e => e.paidById === creditorId)
      .map(e => ({
        expenseId: e.id,
        amount: e.splitDetails?.find(s => s.userId === debtorId)?.owedAmount || 0,
        createdAt: e.createdAt
      }))
      .filter(d => d.amount > 0)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // 2. Get total completed payments and counter-debts from debtorId to creditorId
    const completedPaymentsTotal = payments
      .filter(p => p.payerId === debtorId && p.receiverId === creditorId && p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0) + 
      allExpenses
        .filter(e => e.paidById === debtorId)
        .map(e => e.splitDetails?.find(s => s.userId === creditorId)?.owedAmount || 0)
        .reduce((sum, amt) => sum + amt, 0);

    // 3. Get total pending payments from debtorId to creditorId
    const pendingPaymentsTotal = payments
      .filter(p => p.payerId === debtorId && p.receiverId === creditorId && p.status === 'AWAITING_APPROVAL')
      .reduce((sum, p) => sum + p.amount, 0);

    let creditRemaining = completedPaymentsTotal;
    let pendingRemaining = pendingPaymentsTotal;
    
    let status = 'UNSETTLED';

    for (const debt of debtorDebts) {
      if (creditRemaining >= debt.amount) {
        creditRemaining -= debt.amount;
        if (debt.expenseId === expense.id) {
          status = 'SETTLED';
          break;
        }
      } else {
        const unpaidDebt = debt.amount - creditRemaining;
        creditRemaining = 0;

        if (pendingRemaining >= unpaidDebt) {
          pendingRemaining -= unpaidDebt;
          if (debt.expenseId === expense.id) {
            status = 'AWAITING_APPROVAL';
            break;
          }
        } else {
          pendingRemaining = 0;
          if (debt.expenseId === expense.id) {
            status = 'UNSETTLED';
            break;
          }
        }
      }
    }

    return status;
  };

  const myStatus = isPayer ? 'NONE' : getUserSplitStatus(currentUser?.id, expense.paidById);
  const hasSubRow = (owesAmount > 0 && myStatus !== 'NONE') || (isPayer && expense.splitDetails?.filter(s => s.userId !== currentUser?.id).length > 0);

  return (
    <div className="bg-slate-50/70 border border-slate-200 p-4.5 rounded-xl flex flex-col hover:border-slate-300 transition-colors group/item shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h4 className="font-bold text-slate-800">{expense.description}</h4>
            <div className="flex items-center space-x-2 text-slate-400 opacity-0 group-hover/item:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(expense)}
                className="p-1 hover:text-emerald-600 rounded transition-colors cursor-pointer"
                title="Edit Expense"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(expense)}
                className="p-1 hover:text-red-600 rounded transition-colors cursor-pointer"
                title="Delete Expense"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center space-x-4">
            <span>Paid by <span className="text-slate-700 font-semibold">{isPayer ? 'You' : paidByName}</span></span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-emerald-600">₹{expense.totalAmount.toFixed(2)}</p>
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-500 uppercase tracking-wide shadow-sm">
            {expense.splitType}
          </span>
        </div>
      </div>

      {/* Sub-row for settlement statuses */}
      {hasSubRow && (
        <div className="mt-3 pt-3 border-t border-slate-150/70 flex items-center justify-between text-[11px]">
          {isPayer ? (
            <div className="flex flex-wrap gap-2 text-slate-500 w-full">
              {expense.splitDetails.filter(s => s.userId !== currentUser?.id).map(split => {
                const status = getUserSplitStatus(split.userId, currentUser?.id);
                const settled = status === 'SETTLED';
                const pendingApproval = status === 'AWAITING_APPROVAL';
                const name = membersMap[split.userId]?.name || 'Unknown';
                return (
                  <span key={split.userId} className={`px-2 py-0.5 rounded border ${
                    settled 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100 font-semibold' 
                      : pendingApproval 
                        ? 'bg-amber-50 text-amber-700 border-amber-100 font-semibold animate-pulse'
                        : 'bg-white text-slate-600 border-slate-200'
                  }`}>
                    {name}: {settled ? 'Settled' : pendingApproval ? 'Awaiting approval' : `owes ₹${split.owedAmount.toFixed(2)}`}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              {myStatus === 'SETTLED' ? (
                <span className="text-emerald-750 font-semibold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Your share settled (₹{owesAmount.toFixed(2)})</span>
                </span>
              ) : myStatus === 'AWAITING_APPROVAL' ? (
                <span className="text-amber-750 font-semibold flex items-center space-x-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>Paid, waiting confirmation (₹{owesAmount.toFixed(2)})</span>
                </span>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-rose-600 font-semibold">You owe ₹{owesAmount.toFixed(2)}</span>
                  <button
                    onClick={() => onSettleExpenseShare(expense.paidById, owesAmount, expense.id)}
                    className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
                  >
                    Settle Share
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
