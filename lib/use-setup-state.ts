'use client';

import { useEffect, useState } from 'react';

export function useSetupState() {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/setup-state')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCompleted(data.completed === true);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // On network error, assume setup is done so we don't block the user
        setCompleted(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { completed, loading };
}
