import { useEffect } from 'react';

export default function Toast({ type = 'success', message, onClose, duration = 2500 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const config = {
    success: {
      bg: 'from-emerald-400 to-teal-500',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      title: 'Berhasil!',
      shadow: 'shadow-emerald-300/50',
    },
    error: {
      bg: 'from-rose-400 to-pink-500',
      icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      title: 'Gagal!',
      shadow: 'shadow-rose-300/50',
    },
    info: {
      bg: 'from-indigo-400 to-purple-500',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      title: 'Info',
      shadow: 'shadow-indigo-300/50',
    },
    warning: {
      bg: 'from-amber-400 to-orange-500',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      title: 'Perhatian',
      shadow: 'shadow-amber-300/50',
    },
  }[type];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl ${config.shadow} animate-popIn`}
      >
        <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${config.bg} flex items-center justify-center mb-5 shadow-lg`}>
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={config.icon} />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-2">{config.title}</h3>
        <p className="text-slate-600 text-sm leading-relaxed">{message}</p>

        <button
          onClick={onClose}
          className={`mt-6 w-full py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r ${config.bg} shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all`}
        >
          OK
        </button>
      </div>
    </div>
  );
}