import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../types';

const API = import.meta.env.VITE_API_URL || '';

export function useProject(projectId: string | null, pollInterval = 4000) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await window.fetch(`${API}/api/projects/${projectId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProject(data.project);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch().finally(() => setLoading(false));
    const timer = setInterval(fetch, pollInterval);
    return () => clearInterval(timer);
  }, [projectId, pollInterval, fetch]);

  return { project, loading, error, refetch: fetch };
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await window.fetch(`${API}/api/projects`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.projects || [];
}
