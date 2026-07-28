import { useCallback, useEffect, useState } from 'react';

export function useApi(loader, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await loader();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error.message });
    }
  }, dependencies);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
