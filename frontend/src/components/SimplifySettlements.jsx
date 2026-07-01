import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export default function SimplifySettlements({ simplifiedDebts, membersMap, loading, currentUser, onSettleClick, payments = [] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold flex items-center space-x-1.5 text-slate-800">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <span>Simplify Settlements</span>
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
        </div>
      ) : simplifiedDebts.length === 0 ? (
        <p className="text-center py-6 text-slate-500 text-sm font-semibold">All balances are completely settled!</p>
      ) : (
        <div className="space-y-3">
          {simplifiedDebts.map((debt, index) => {
            const isUserDebtor = debt.fromUserId === currentUser?.id;
            const isUserCreditor = debt.toUserId === currentUser?.id;
            
            // Check if a payment between these users is currently pending confirmation
            const pendingPayment = payments.find(p => 
              p.payerId === debt.fromUserId && 
              p.receiverId === debt.toUserId && 
              p.status === 'AWAITING_APPROVAL'
            );
            
            return (
              <div 
                key={index}
                className="bg-slate-50/70 border border-slate-200 p-3.5 rounded-xl text-sm flex flex-col justify-center space-y-2.5 shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800">
                    {debt.fromUserId === currentUser?.id ? 'You' : (membersMap[debt.fromUserId]?.name || 'Unknown')}
                  </span>
                  <span className="text-slate-500 text-xs px-2 py-0.5 bg-white border border-slate-200 rounded shadow-sm font-semibold">
                    owes
                  </span>
                  <span className="font-semibold text-slate-800">
                    {debt.toUserId === currentUser?.id ? 'You' : (membersMap[debt.toUserId]?.name || 'Unknown')}
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                  <div>
                    {pendingPayment ? (
                      <span className="text-amber-700 font-bold text-xs bg-amber-50 border border-amber-250 px-2.5 py-1.5 rounded-lg flex items-center space-x-1 animate-pulse">
                        Pending Receipt...
                      </span>
                    ) : (
                      <>
                        {isUserDebtor && (
                          <button
                            onClick={() => onSettleClick(currentUser.id, debt.toUserId, debt.amount)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm shadow-emerald-600/10 cursor-pointer"
                          >
                            Settle Up
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <span className="text-emerald-600 font-extrabold text-base">₹{debt.amount.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
