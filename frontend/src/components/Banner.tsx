import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function MessageBanner() {
  const [params, setParams] = useSearchParams();
  const msg = params.get('msg');
  const [visible, setVisible] = useState(!!msg);

  useEffect(() => {
    setVisible(!!params.get('msg'));
  }, [params]);

  if (!msg || !visible) return null;

  return (
    <div
      role="status"
      className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
    >
      <span>{msg}</span>
      <button
        type="button"
        aria-label="Dismiss"
        className="shrink-0 text-emerald-600 hover:text-emerald-900"
        onClick={() => {
          setVisible(false);
          const next = new URLSearchParams(params);
          next.delete('msg');
          setParams(next, { replace: true });
        }}
      >
        ✕
      </button>
    </div>
  );
}
