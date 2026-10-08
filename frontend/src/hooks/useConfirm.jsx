import { useState, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

export function useConfirm() {
  const [state, setState] = useState({
    open: false,
    type: 'danger',
    title: '',
    message: '',
    confirmText: 'Ya, Lanjutkan',
    cancelText: 'Batal',
    onConfirm: null,
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        type: options.type || 'danger',
        title: options.title || 'Konfirmasi',
        message: options.message || 'Apakah Anda yakin?',
        confirmText: options.confirmText || 'Ya, Lanjutkan',
        cancelText: options.cancelText || 'Batal',
        onConfirm: () => {
          setState((s) => ({ ...s, open: false }));
          resolve(true);
        },
      });
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const ConfirmComponent = (
    <ConfirmDialog
      open={state.open}
      type={state.type}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      onConfirm={state.onConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmComponent };
}