import { useState, useCallback } from 'react';
import Toast from '../components/Toast';

export function useToast() {
  const [toast, setToast] = useState({ type: 'success', message: '' });

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast({ type: 'success', message: '' });
  }, []);

  const ToastComponent = (
    <Toast type={toast.type} message={toast.message} onClose={hideToast} duration={2500} />
  );

  return { showToast, hideToast, ToastComponent };
}