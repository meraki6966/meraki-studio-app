import type { Asset } from '../types';

interface AssetPanelProps {
  assets: Asset[];
  onAssetClick: (asset: Asset) => void;
  selectedAssetId: string | null;
}

function statusColor(status: Asset['status']): string {
  switch (status) {
    case 'ready': return '#4ade80';
    case 'pending': return 'var(--amber)';
    case 'processing': return 'var(--sky)';
    case 'error': return '#f87171';
    default: return 'var(--text-muted)';
  }
}

function assetTypeIcon(type: Asset['type']): string {
  switch (type) {
    case 'video': return '▶';
    case 'audio': return '♫';
    case 'image': return '⬛';
    default: return '·';
  }
}

export function AssetPanel({ assets, onAssetClick, selectedAssetId }: AssetPanelProps) {
  const readyCount = assets.filter(a => a.status === 'ready').length;
  const pendingCount = assets.filter(a => a.status === 'pending' || a.status === 'processing').length;

  return (
    <div style={{
      width: 'var(--panel-w)',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 6,
        }}>
          Assets
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#4ade80' }}>{readyCount} ready</span>
          {pendingCount > 0 && (
            <span style={{ fontSize: 10, color: 'var(--amber)' }}>{pendingCount} generating</span>
          )}
        </div>
      </div>

      {/* Asset list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {assets.length === 0 ? (
          <div style={{
            padding: '24px 12px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 11,
            lineHeight: 1.6,
          }}>
            No assets yet.
            <br />
            <span style={{ color: 'var(--text-secondary)' }}>
              Tell Claude Code to generate a clip.
            </span>
          </div>
        ) : (
          assets.map(asset => (
            <AssetRow
              key={asset.id}
              asset={asset}
              selected={asset.id === selectedAssetId}
              onClick={() => onAssetClick(asset)}
            />
          ))
        )}
      </div>

      {/* Footer: MCP hint */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.5, fontFamily: 'var(--font-mono)' }}>
          MCP tools available:
          <br />generate_video_clip
          <br />add_clip_to_track
          <br />render_project
        </div>
      </div>
    </div>
  );
}

function AssetRow({ asset, selected, onClick }: { asset: Asset; selected: boolean; onClick: () => void }) {
  const isPending = asset.status === 'pending' || asset.status === 'processing';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '7px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        background: selected ? 'var(--amber-dim)' : 'transparent',
        borderLeft: `2px solid ${selected ? 'var(--amber)' : 'transparent'}`,
        transition: 'all 0.1s',
      }}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)';
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {/* Thumbnail or icon */}
      <div style={{
        width: 40,
        height: 26,
        background: 'var(--bg-elevated)',
        borderRadius: 3,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        position: 'relative',
      }}>
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{
            fontSize: isPending ? 10 : 14,
            color: isPending ? 'var(--amber)' : 'var(--text-muted)',
            animation: isPending ? 'pulse 1.5s ease-in-out infinite' : undefined,
          }}>
            {isPending ? '⟳' : assetTypeIcon(asset.type)}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 500,
          color: asset.status === 'error' ? '#f87171' : 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {asset.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <span className={`tag tag-${asset.status}`}>
            {asset.status}
          </span>
          {asset.duration && (
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {asset.duration.toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* Status dot */}
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        flexShrink: 0,
        background: statusColor(asset.status),
        boxShadow: asset.status === 'ready' ? '0 0 4px #4ade80' : undefined,
      }} />

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}
