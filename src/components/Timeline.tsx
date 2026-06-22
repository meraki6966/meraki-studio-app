import { useRef, useCallback, useEffect } from 'react';
import type { Project, Track, Clip, Asset } from '../types';

interface TimelineProps {
  project: Project;
  currentTime: number;
  onSeek: (time: number) => void;
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
}

const PX_PER_SEC = 80; // pixels per second at 1x zoom
const MIN_DURATION_VIEW = 20; // always show at least 20s

function formatRulerTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
  return `${s}s`;
}

function trackColor(type: Track['type']): { bg: string; border: string; label: string } {
  switch (type) {
    case 'video': return { bg: 'var(--clip-video-bg)', border: 'var(--clip-video-border)', label: '#60a5fa' };
    case 'audio': return { bg: 'var(--clip-audio-bg)', border: 'var(--clip-audio-border)', label: '#a78bfa' };
    case 'overlay': return { bg: 'var(--clip-overlay-bg)', border: 'var(--clip-overlay-border)', label: 'var(--sky)' };
    default: return { bg: 'var(--bg-elevated)', border: 'var(--border)', label: 'var(--text-secondary)' };
  }
}

function TrackTypeIcon({ type }: { type: Track['type'] }) {
  if (type === 'video') return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="2.5" width="7" height="7" rx="1" />
      <path d="M8 4.5l3-2v7l-3-2V4.5z" />
    </svg>
  );
  if (type === 'audio') return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 4.5h2l2-3 2 9 2-6 1 3h1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="10" height="10" rx="1.5" />
      <path d="M4 6h4M6 4v4" strokeLinecap="round" />
    </svg>
  );
}

export function Timeline({ project, currentTime, onSeek, selectedClipId, onSelectClip }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const totalDuration = Math.max(project.duration, MIN_DURATION_VIEW);
  const totalWidth = Math.max(totalDuration * PX_PER_SEC + 200, 800);

  // Ruler tick marks
  const tickInterval = PX_PER_SEC >= 60 ? 1 : PX_PER_SEC >= 30 ? 2 : 5;
  const ticks: number[] = [];
  for (let t = 0; t <= totalDuration + tickInterval; t += tickInterval) {
    ticks.push(t);
  }

  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
    const time = (x - 0) / PX_PER_SEC;
    onSeek(Math.max(0, time));
  }, [onSeek]);

  // Auto-scroll playhead into view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const playheadX = currentTime * PX_PER_SEC;
    const viewLeft = el.scrollLeft;
    const viewRight = viewLeft + el.clientWidth - 120;
    if (playheadX > viewRight) {
      el.scrollLeft = playheadX - el.clientWidth / 2;
    }
  }, [currentTime]);

  const playheadX = currentTime * PX_PER_SEC;

  return (
    <div style={{
      flex: 1,
      background: 'var(--bg-base)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      minHeight: 180,
    }}>
      {/* Scrollable area */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}
      >
        <div style={{ width: totalWidth, position: 'relative', minHeight: '100%' }}>

          {/* Ruler */}
          <div
            ref={rulerRef}
            onClick={handleRulerClick}
            style={{
              height: 'var(--ruler-h)',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'flex-end',
              paddingLeft: 'var(--track-label-w)',
              cursor: 'col-resize',
              userSelect: 'none',
            }}
          >
            {ticks.map(t => (
              <div
                key={t}
                style={{
                  position: 'absolute',
                  left: `calc(var(--track-label-w) + ${t * PX_PER_SEC}px)`,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span style={{
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  color: t % 5 === 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                  marginBottom: 2,
                  userSelect: 'none',
                }}>
                  {t % (tickInterval * 2) === 0 ? formatRulerTime(t) : ''}
                </span>
                <div style={{
                  width: 1,
                  height: t % 5 === 0 ? 8 : 4,
                  background: t % 5 === 0 ? 'var(--border-bright)' : 'var(--border)',
                }} />
              </div>
            ))}

            {/* Playhead on ruler */}
            <div style={{
              position: 'absolute',
              left: `calc(var(--track-label-w) + ${playheadX}px)`,
              top: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 20,
            }}>
              <div style={{
                width: 10,
                height: 10,
                background: 'var(--amber)',
                clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                marginBottom: 0,
                boxShadow: '0 0 8px var(--amber)',
              }} />
              <div style={{
                width: 1,
                flex: 1,
                background: 'var(--amber)',
                boxShadow: '0 0 6px var(--amber)',
              }} />
            </div>
          </div>

          {/* Tracks */}
          <div style={{ position: 'relative' }}>
            {project.tracks.map((track, trackIndex) => (
              <TrackRow
                key={track.id}
                track={track}
                assets={project.assets}
                totalWidth={totalWidth}
                selectedClipId={selectedClipId}
                onSelectClip={onSelectClip}
                isAlternate={trackIndex % 2 === 1}
              />
            ))}

            {/* Playhead line through tracks */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `calc(var(--track-label-w) + ${playheadX}px)`,
                width: 1,
                background: 'var(--amber)',
                boxShadow: '0 0 12px var(--amber), 0 0 24px var(--amber-dim)',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            />

            {/* Amber glow spread */}
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `calc(var(--track-label-w) + ${playheadX}px - 20px)`,
              width: 40,
              background: 'linear-gradient(90deg, transparent, var(--amber-glow), transparent)',
              pointerEvents: 'none',
              zIndex: 4,
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TrackRow ────────────────────────────────────────────────────────

function TrackRow({
  track,
  assets,
  totalWidth,
  selectedClipId,
  onSelectClip,
  isAlternate,
}: {
  track: Track;
  assets: Asset[];
  totalWidth: number;
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  isAlternate: boolean;
}) {
  const colors = trackColor(track.type);

  return (
    <div style={{
      height: 'var(--track-h)',
      display: 'flex',
      borderBottom: '1px solid var(--border)',
      background: isAlternate ? 'rgba(255,255,255,0.012)' : 'transparent',
    }}>
      {/* Track label */}
      <div style={{
        width: 'var(--track-label-w)',
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '0 10px',
        position: 'sticky',
        left: 0,
        zIndex: 3,
      }}>
        <span style={{ color: colors.label, flexShrink: 0 }}>
          <TrackTypeIcon type={track.type} />
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {track.name}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
          {track.clips.length}
        </span>
      </div>

      {/* Clip area */}
      <div style={{
        flex: 1,
        position: 'relative',
        width: totalWidth - 120,
        overflow: 'visible',
      }}>
        {track.clips.map(clip => {
          const asset = assets.find(a => a.id === clip.assetId);
          return (
            <ClipBlock
              key={clip.id}
              clip={clip}
              asset={asset}
              trackColors={colors}
              selected={clip.id === selectedClipId}
              onClick={() => onSelectClip(clip.id === selectedClipId ? null : clip.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── ClipBlock ───────────────────────────────────────────────────────

function ClipBlock({
  clip,
  asset,
  trackColors,
  selected,
  onClick,
}: {
  clip: Clip;
  asset: Asset | undefined;
  trackColors: { bg: string; border: string; label: string };
  selected: boolean;
  onClick: () => void;
}) {
  const left = clip.startTime * PX_PER_SEC;
  const width = Math.max(clip.duration * PX_PER_SEC, 4);
  const label = clip.label || asset?.name || clip.id.slice(0, 8);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`${label} · ${clip.duration.toFixed(1)}s · start: ${clip.startTime.toFixed(1)}s`}
      style={{
        position: 'absolute',
        top: 5,
        bottom: 5,
        left,
        width,
        background: selected
          ? `linear-gradient(135deg, ${trackColors.bg}, rgba(245,158,11,0.12))`
          : trackColors.bg,
        border: `1px solid ${selected ? 'var(--amber)' : trackColors.border}`,
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 0 0 1px var(--amber), 0 0 10px var(--amber-dim)'
          : '0 1px 4px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.1s, border-color 0.1s',
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px',
        zIndex: selected ? 2 : 1,
      }}
    >
      {/* Thumbnail bg if available */}
      {asset?.thumbnailUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${asset.thumbnailUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.18,
        }} />
      )}

      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 3,
        background: selected ? 'var(--amber)' : trackColors.label,
        borderRadius: '3px 0 0 3px',
      }} />

      {/* Label */}
      {width > 30 && (
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          color: selected ? 'var(--amber)' : 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginLeft: 6,
          position: 'relative',
          zIndex: 1,
          letterSpacing: '0.01em',
        }}>
          {label}
        </span>
      )}

      {/* Duration tag */}
      {width > 60 && (
        <span style={{
          position: 'absolute',
          right: 4,
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          zIndex: 1,
        }}>
          {clip.duration.toFixed(1)}s
        </span>
      )}
    </div>
  );
}
