import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function Banner() {
  const [params, setParams] = useSearchParams();
  const [visible, setVisible] = useState(true);
  const msg = params.get('msg');

  useEffect(() => {
    setVisible(true);
  }, [msg]);

  if (!msg || !visible) return null;

  return (
    <div className="mb-4 flex items-start justify-between rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <span>{msg}</span>
      <button
        type="button"
        aria-label="Dismiss"
        className="ml-4 text-emerald-600 hover:text-emerald-900"
        onClick={() => {
          setVisible(false);
          const next = new URLSearchParams(params);
          next.delete('msg');
          setParams(next, { replace: true });
        }}
      >
        ×
      </button>
    </div>
  );
}
