'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useSetupState() {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from('setup_state')
      .select('completed')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setCompleted(data?.completed ?? false);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { completed, loading };
}
