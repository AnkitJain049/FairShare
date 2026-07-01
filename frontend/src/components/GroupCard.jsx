import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function GroupCard({ group }) {
  return (
    <Link
      to={`/group/${group.id}`}
      className="bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50/50 p-6 rounded-2xl shadow-sm transition-all flex flex-col justify-between group"
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
          {group.name}
        </h3>
      </div>
      
      <div className="border-t border-slate-100 mt-6 pt-4 flex items-center justify-between text-xs text-slate-500 font-semibold">
        <span>{group.memberIds?.length || 0} Members</span>
        <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}
