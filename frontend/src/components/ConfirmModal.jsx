import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete Permanently',
  cancelText = 'Cancel',
  type = 'danger'
}) {
  if (!isOpen) return null;

  const headerColor = type === 'danger' ? 'text-red-600' : 'text-amber-600';
  const buttonBg = type === 'danger' 
    ? 'bg-red-700 hover:bg-red-800 shadow-red-200' 
    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className={`text-xl font-bold mb-3 flex items-center space-x-2 ${headerColor}`}>
          <AlertCircle className="h-6 w-6" />
          <span>{title}</span>
        </h2>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${buttonBg} text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
