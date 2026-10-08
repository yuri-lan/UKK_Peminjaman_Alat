import { useEffect } from 'react';

export default function ConfirmDialog({
  open,
  type = 'danger',
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && open) onCancel?.();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onCancel]);

  if (!open) return null;

  const config = {
    danger: {
      bg: 'from-rose-400 to-pink-500',
      icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      shadow: 'shadow-rose-300/50',
      btn: 'from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700',
    },
    warning: {
      bg: 'from-amber-400 to-orange-500',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      shadow: 'shadow-amber-300/50',
      btn: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
    },
    success: {
      bg: 'from-emerald-400 to-teal-500',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      shadow: 'shadow-emerald-300/50',
      btn: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
    },
    info: {
      bg: 'from-indigo-400 to-purple-500',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      shadow: 'shadow-indigo-300/50',
      btn: 'from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700',
    },
  }[type] || config?.info;

  const c = config || {
    bg: 'from-slate-400 to-slate-500',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    shadow: 'shadow-slate-300/50',
    btn: 'from-slate-500 to-slate-600',
  };

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl ${c.shadow} animate-popIn`}
      >
        <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${c.bg} flex items-center justify-center mb-5 shadow-lg`}>
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={c.icon} />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600 text-sm leading-relaxed">{message}</p>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r ${c.btn} shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}