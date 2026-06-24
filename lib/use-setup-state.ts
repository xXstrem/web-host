'use client';

import { useEffect, useState } from 'react';

export function useSetupState() {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/setup-state')
      .then((r) => r.json())
      .then((data) => {
        setCompleted(data.completed === true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { completed, loading };
}
