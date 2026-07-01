import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function BalanceSummary({ balances, currentUser, membersMap }) {
  if (!balances) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-5 text-slate-850">Your Balance Summary</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-center shadow-sm">
          <div className="flex items-center space-x-1 text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>You are owed</span>
          </div>
          <p className="text-2xl font-black text-emerald-600">₹{balances.totalYouAreOwed.toFixed(2)}</p>
        </div>
        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-center shadow-sm">
          <div className="flex items-center space-x-1 text-xs text-rose-600 font-semibold uppercase tracking-wider mb-1">
            <TrendingDown className="h-4 w-4" />
            <span>You owe</span>
          </div>
          <p className="text-2xl font-black text-rose-600">₹{balances.totalYouOwe.toFixed(2)}</p>
        </div>
      </div>

      {/* Individual member breakdown */}
      <div>
        <h4 className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-3">Group Balances Breakdown</h4>
        <div className="space-y-3">
          {Object.entries(balances.userVsBalance).map(([memberId, amt]) => {
            if (memberId === currentUser?.id) return null;
            const value = parseFloat(amt);
            const name = membersMap[memberId]?.name || 'Unknown';
            
            return (
              <div key={memberId} className="flex justify-between items-center text-sm bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-750">{name}</span>
                {value > 0 ? (
                  <span className="text-emerald-600 font-bold text-xs">owes you ₹{value.toFixed(2)}</span>
                ) : value < 0 ? (
                  <span className="text-rose-600 font-bold text-xs">you owe ₹{Math.abs(value).toFixed(2)}</span>
                ) : (
                  <span className="text-slate-500 font-bold text-xs">settled</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
