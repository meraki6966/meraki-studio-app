import { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import { Toolbar } from './components/Toolbar';
import { AssetPanel } from './components/AssetPanel';
import { Timeline } from './components/Timeline';
import { useProject, fetchProjects } from './hooks/useProject';
import type { Project, Asset } from './types';
import { callTool, clearToken, hasToken, setToken, LockedError, UnauthorizedError } from './api';

export default function App() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [unlocked, setUnlocked] = useState(hasToken());
  const [tokenInput, setTokenInput] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const { project, error } = useProject(unlocked ? projectId : null, 3000);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // If the API stops accepting the token, go back to the token screen.
  useEffect(() => {
    const lock = () => { setUnlocked(false); setProjectId(null); setAllProjects([]); setGateError('The studio token was not accepted. Enter it again.'); };
    window.addEventListener('studio-unauthorized', lock);
    return () => window.removeEventListener('studio-unauthorized', lock);
  }, []);

  // Auto-select first project once the studio is unlocked
  useEffect(() => {
    if (!unlocked) return;
    fetchProjects()
      .then(projects => {
        setAllProjects(projects);
        if (projects.length > 0 && !projectId) {
          setProjectId(projects[0].id);
        }
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) return;
        notify(err instanceof LockedError ? err.message : 'Could not reach the Studio API.', 'error');
      });
  }, [unlocked]);

  // Refresh project list when picker opens
  useEffect(() => {
    if (showProjectPicker && unlocked) {
      fetchProjects().then(setAllProjects).catch(() => {});
    }
  }, [showProjectPicker, unlocked]);

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tokenInput.trim() || checking) return;
    setChecking(true);
    setGateError(null);
    setToken(tokenInput);
    try {
      const projects = await fetchProjects();
      setAllProjects(projects);
      setTokenInput('');
      setUnlocked(true);
    } catch (err) {
      clearToken();
      setGateError(
        err instanceof UnauthorizedError ? 'That token was not accepted.'
          : err instanceof LockedError ? err.message
          : 'Could not reach the Studio API.'
      );
    } finally {
      setChecking(false);
    }
  };

  const handleLock = () => {
    clearToken();
    setUnlocked(false);
    setProjectId(null);
    setAllProjects([]);
    setGateError(null);
  };

  // Playback simulation
  useEffect(() => {
    if (playing && project) {
      playTimer.current = setInterval(() => {
        setCurrentTime(t => {
          if (t >= project.duration) {
            setPlaying(false);
            return 0;
          }
          return t + 0.1;
        });
      }, 100);
    } else {
      if (playTimer.current) clearInterval(playTimer.current);
    }
    return () => { if (playTimer.current) clearInterval(playTimer.current); };
  }, [playing, project?.duration]);

  const notify = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleRender = useCallback(async () => {
    if (!projectId) return;
    setRendering(true);
    setRenderStatus('Starting render...');
    try {
      const data = await callTool('render_project', { projectId, quality: 'draft' });
      const result = data.result?.content?.[0]?.text;
      if (result) {
        const parsed = JSON.parse(result);
        if (parsed.jobId) {
          pollRenderJob(parsed.jobId);
        }
      }
    } catch {
      notify('Render failed to start', 'error');
      setRendering(false);
      setRenderStatus(null);
    }
  }, [projectId]);

  const pollRenderJob = useCallback(async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const data = await callTool('check_render_status', { jobId });
        const result = JSON.parse(data.result?.content?.[0]?.text || '{}');

        if (result.status === 'done') {
          clearInterval(interval);
          setRendering(false);
          setRenderStatus(null);
          notify(`Render complete! ${result.outputUrl ? '— ' + result.outputUrl : ''}`, 'success');
        } else if (result.status === 'error') {
          clearInterval(interval);
          setRendering(false);
          setRenderStatus(null);
          notify(`Render failed: ${result.errorMessage}`, 'error');
        } else {
          setRenderStatus(`Rendering... (${result.status})`);
        }
      } catch {
        clearInterval(interval);
        setRendering(false);
        setRenderStatus(null);
      }
    }, 3000);
  }, []);

  // The API refuses every request without the studio token, so nothing else
  // is drawn until one has been accepted.
  if (!unlocked) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <form onSubmit={handleUnlock} style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--amber)', letterSpacing: '-0.02em' }}>
            Meraki Video Studio
          </div>
          <label htmlFor="studio-token" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Studio token
          </label>
          <input
            id="studio-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            aria-describedby="studio-token-note"
            autoFocus
          />
          <button className="btn btn-primary" type="submit" disabled={checking || !tokenInput.trim()}>
            {checking ? 'Checking' : 'Unlock'}
          </button>
          {gateError && (
            <div role="alert" style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#f87171', fontSize: 12 }}>
              {gateError}
            </div>
          )}
          <div id="studio-token-note" style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The token is the STUDIO_API_TOKEN set on the server. It is kept in this browser tab only and is gone when the tab closes.
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Toolbar */}
      <Toolbar
        project={project}
        onSelectProject={() => setShowProjectPicker(true)}
        playing={playing}
        onPlay={() => setPlaying(p => !p)}
        currentTime={currentTime}
        onRender={handleRender}
        rendering={rendering}
      />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Asset Panel */}
        <AssetPanel
          assets={project?.assets || []}
          onAssetClick={(asset: Asset) => setSelectedAssetId(asset.id)}
          selectedAssetId={selectedAssetId}
        />

        {/* Center: Status / Welcome */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!project && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              color: 'var(--text-secondary)',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 32,
                color: 'var(--amber)',
                letterSpacing: '-0.02em',
              }}>
                Meraki Video Studio
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Where Soul Meets Software
              </div>
              {error && (
                <div style={{
                  padding: '10px 18px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 6,
                  color: '#f87171',
                  fontSize: 12,
                  maxWidth: 400,
                  textAlign: 'center',
                }}>
                  Cannot connect to MCP server. Start the API with <code style={{ fontFamily: 'var(--font-mono)' }}>npm run dev</code> in <code style={{ fontFamily: 'var(--font-mono)' }}>api/</code>
                </div>
              )}
              {!error && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowProjectPicker(true)}
                >
                  Open a Project
                </button>
              )}
            </div>
          )}

          {project && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-base)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Preview area */}
              <div style={{
                aspectRatio: `${project.resolution.width} / ${project.resolution.height}`,
                maxWidth: '80%',
                maxHeight: '80%',
                background: '#000',
                border: '1px solid var(--border)',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  textAlign: 'center',
                  lineHeight: 1.8,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>▶</div>
                  <div>{project.resolution.width}x{project.resolution.height} · {project.fps}fps</div>
                  <div style={{ color: 'var(--text-amber)' }}>{project.tracks.reduce((n, t) => n + t.clips.length, 0)} clips on timeline</div>
                  <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                    Render to preview the final video
                  </div>
                </div>

                {renderStatus && (
                  <div style={{
                    position: 'absolute',
                    bottom: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.8)',
                    border: '1px solid var(--amber-border)',
                    borderRadius: 4,
                    padding: '4px 12px',
                    fontSize: 11,
                    color: 'var(--amber)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {renderStatus}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {project && (
        <Timeline
          project={project}
          currentTime={currentTime}
          onSeek={setCurrentTime}
          selectedClipId={selectedClipId}
          onSelectClip={setSelectedClipId}
        />
      )}

      {/* Project Picker Modal */}
      {showProjectPicker && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(6,16,30,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
        }} onClick={() => setShowProjectPicker(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 24,
              width: 480,
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                Projects
              </span>
              <button
                className="btn btn-ghost"
                style={{ padding: '3px 8px' }}
                onClick={() => setShowProjectPicker(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allProjects.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '12px 0' }}>
                  No projects yet. Use Claude Code to create one:
                  <pre style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 4,
                    fontSize: 11,
                    color: 'var(--text-amber)',
                    fontFamily: 'var(--font-mono)',
                    border: '1px solid var(--border)',
                  }}>
                    {`create_project("My First Video")`}
                  </pre>
                </div>
              ) : (
                allProjects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { setProjectId(p.id); setShowProjectPicker(false); }}
                    style={{
                      padding: '10px 14px',
                      background: p.id === projectId ? 'var(--amber-dim)' : 'var(--bg-elevated)',
                      border: `1px solid ${p.id === projectId ? 'var(--amber-border)' : 'var(--border)'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'all 0.1s',
                    }}
                  >
                    <div style={{
                      width: 36, height: 22,
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 10, color: 'var(--amber)' }}>▶</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                        {p.duration.toFixed(1)}s · {p.tracks.reduce((n, t) => n + t.clips.length, 0)} clips · {p.assets.length} assets
                      </div>
                    </div>
                    {p.id === projectId && (
                      <span style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 600 }}>OPEN</span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{
              padding: '10px 12px',
              background: 'var(--bg-elevated)',
              borderRadius: 6,
              border: '1px solid var(--border)',
              fontSize: 10,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.7,
            }}>
              Projects are created and managed by Claude Code via MCP.
              <br />Connect: <span style={{ color: 'var(--text-amber)' }}>claude mcp add --transport http meraki-studio http://127.0.0.1:19789/mcp --header "Authorization: Bearer YOUR_TOKEN"</span>
            </div>
            <button className="btn btn-ghost" type="button" onClick={handleLock} style={{ marginTop: 12 }}>
              Lock the studio on this tab
            </button>
          </div>
        </div>
      )}

      {/* Notification toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          padding: '10px 16px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          zIndex: 200,
          maxWidth: 360,
          border: '1px solid',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          ...(notification.type === 'success' ? {
            background: 'rgba(34,197,94,0.12)',
            borderColor: 'rgba(34,197,94,0.3)',
            color: '#4ade80',
          } : notification.type === 'error' ? {
            background: 'rgba(239,68,68,0.12)',
            borderColor: 'rgba(239,68,68,0.3)',
            color: '#f87171',
          } : {
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }),
        }}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}
