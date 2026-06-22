import type { Project } from '../types';

interface ToolbarProps {
  project: Project | null;
  onSelectProject: () => void;
  playing: boolean;
  onPlay: () => void;
  currentTime: number;
  onRender: () => void;
  rendering: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const f = Math.floor((seconds % 1) * 10);
  return `${m}:${s}.${f}`;
}

export function Toolbar({ project, onSelectProject, playing, onPlay, currentTime, onRender, rendering }: ToolbarProps) {
  return (
    <div style={{
      height: 'var(--toolbar-h)',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 16,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginRight: 8 }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--amber)',
          letterSpacing: '-0.01em',
        }}>Meraki Studio</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          AI Video
        </span>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* Project selector */}
      <button className="btn btn-ghost" onClick={onSelectProject} style={{ fontSize: 12 }}>
        {project ? (
          <>
            <FolderIcon />
            <span style={{ color: 'var(--text-primary)' }}>{project.name}</span>
          </>
        ) : (
          <>
            <FolderIcon />
            <span>Open Project</span>
          </>
        )}
        <ChevronIcon />
      </button>

      {project && (
        <>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

          {/* Transport controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              className="btn btn-ghost"
              onClick={onPlay}
              style={{
                padding: '5px 10px',
                background: playing ? 'var(--amber-dim)' : undefined,
                borderColor: playing ? 'var(--amber-border)' : undefined,
                color: playing ? 'var(--amber)' : undefined,
              }}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>

          {/* Timecode */}
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--text-amber)',
            letterSpacing: '0.05em',
            minWidth: 72,
          }}>
            {formatTime(currentTime)}
          </span>

          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            / {formatTime(project.duration)}
          </span>

          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

          {/* Project meta */}
          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            {project.resolution.width}x{project.resolution.height} · {project.fps}fps
          </span>

          <div style={{ flex: 1 }} />

          {/* Render */}
          <button
            className="btn btn-primary"
            onClick={onRender}
            disabled={rendering}
            style={{ opacity: rendering ? 0.7 : 1 }}
          >
            {rendering ? <SpinIcon /> : <RenderIcon />}
            {rendering ? 'Rendering...' : 'Render'}
          </button>
        </>
      )}

      {!project && <div style={{ flex: 1 }} />}

      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#4ade80',
          boxShadow: '0 0 6px #4ade80',
        }} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>MCP LIVE</span>
      </div>
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M2 1.5l9 4.5-9 4.5V1.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="1.5" width="3" height="9" rx="0.5" />
      <rect x="7" y="1.5" width="3" height="9" rx="0.5" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.25L6 3.5h5.5A1.5 1.5 0 0 1 13 5v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 1 11V3.5z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 4l2.5 2.5L7.5 4" />
    </svg>
  );
}

function RenderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="6" />
      <path d="M5 4.5l5 2.5-5 2.5V4.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SpinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ animation: 'spin 1s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.93 2.93l1.41 1.41M9.66 9.66l1.41 1.41M2.93 11.07l1.41-1.41M9.66 4.34l1.41-1.41" />
    </svg>
  );
}
