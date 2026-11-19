import { useCallback, useState } from 'react';

let nextId = 1;

/** Transient notifications. Errors stay longer and can carry a request id for support/debugging. */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message, { type = 'success', requestId = null } = {}) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { id, message, type, requestId }]);
      setTimeout(() => removeToast(id), type === 'error' ? 7000 : 3500);
    },
    [removeToast],
  );

  const toastError = useCallback(
    (err) => addToast(err.message, { type: 'error', requestId: err.requestId }),
    [addToast],
  );

  return { toasts, addToast, toastError, removeToast };
}
