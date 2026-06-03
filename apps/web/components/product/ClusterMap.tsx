// apps/web/components/product/ClusterMap.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface ClusterPoint {
  x: number;
  y: number;
  clusterId: string;
  isDeviant?: boolean;
}

interface ClusterMapProps {
  points: ClusterPoint[];
  selectedClusterId?: string;
  onClusterSelect?: (clusterId: string) => void;
  className?: string;
}

// Color palette per cluster — uses accent + status hues
const CLUSTER_PALETTE = [
  '#4ade80', // accent-like green
  '#60a5fa', // blue / info
  '#f59e0b', // warn amber
  '#a78bfa', // purple
  '#f87171', // fail red
  '#34d399', // teal
  '#fb923c', // orange
  '#e879f9', // pink
];

function getClusterColor(clusterId: string, allIds: string[]): string {
  const idx = allIds.indexOf(clusterId);
  return CLUSTER_PALETTE[idx % CLUSTER_PALETTE.length] ?? '#94a3b8';
}

const SVG_SIZE = 300;
const PADDING = 24;
const PLOT_SIZE = SVG_SIZE - PADDING * 2;

function scalePoints(points: ClusterPoint[]) {
  if (points.length === 0) return points.map(() => ({ cx: 0, cy: 0 }));
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  return points.map((p) => ({
    cx: PADDING + ((p.x - minX) / rangeX) * PLOT_SIZE,
    cy: PADDING + ((p.y - minY) / rangeY) * PLOT_SIZE,
  }));
}

export function ClusterMap({
  points,
  selectedClusterId,
  onClusterSelect,
  className,
}: ClusterMapProps) {
  const [hoveredCluster, setHoveredCluster] = React.useState<string | null>(null);
  const [tooltip, setTooltip] = React.useState<{ x: number; y: number; id: string } | null>(null);

  const clusterIds = Array.from(new Set(points.map((p) => p.clusterId))).sort();
  const scaled = scalePoints(points);

  // Group points by cluster for keyboard nav
  const pointsByCluster = React.useMemo(() => {
    const map = new Map<string, ClusterPoint[]>();
    points.forEach((p) => {
      const arr = map.get(p.clusterId) ?? [];
      arr.push(p);
      map.set(p.clusterId, arr);
    });
    return map;
  }, [points]);

  const summary = clusterIds
    .map((id) => {
      const pts = pointsByCluster.get(id) ?? [];
      const deviants = pts.filter((p) => p.isDeviant).length;
      return `Cluster ${id}: ${pts.length} points${deviants > 0 ? `, ${deviants} déviants` : ''}`;
    })
    .join('; ');

  return (
    <div className={cn('relative inline-block', className)}>
      <svg
        role="img"
        aria-label={`Carte de clusters. ${summary}`}
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="rounded-[var(--r-lg)] border border-border-default bg-surface"
        style={{ display: 'block' }}
      >
        {/* Background grid */}
        <defs>
          <pattern id="cm-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border-subtle" opacity="0.5" />
          </pattern>
        </defs>
        <rect width={SVG_SIZE} height={SVG_SIZE} fill="url(#cm-grid)" />

        {/* Cluster groups — for keyboard nav, each group is a focusable <g> */}
        {clusterIds.map((clusterId) => {
          const clusterPoints = pointsByCluster.get(clusterId) ?? [];
          const color = getClusterColor(clusterId, clusterIds);
          const isSelected = clusterId === selectedClusterId;
          const isHovered = clusterId === hoveredCluster;

          return (
            <g
              key={clusterId}
              role="button"
              aria-label={`Cluster ${clusterId}, ${clusterPoints.length} points`}
              aria-pressed={isSelected}
              tabIndex={0}
              style={{ cursor: onClusterSelect ? 'pointer' : 'default' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClusterSelect?.(clusterId);
                }
              }}
              onClick={() => onClusterSelect?.(clusterId)}
            >
              {clusterPoints.map((pt, i) => {
                const sp = scaled[points.indexOf(pt)];
                if (!sp) return null;
                const isDeviant = pt.isDeviant === true;
                const r = isDeviant ? 7 : 4;
                return (
                  <circle
                    key={i}
                    cx={sp.cx}
                    cy={sp.cy}
                    r={isHovered || isSelected ? r + 2 : r}
                    fill={isDeviant ? '#f87171' : color}
                    fillOpacity={isSelected ? 1 : 0.75}
                    stroke={isSelected ? 'white' : 'none'}
                    strokeWidth={isSelected ? 1.5 : 0}
                    onMouseEnter={() => {
                      setHoveredCluster(clusterId);
                      setTooltip({ x: sp.cx, y: sp.cy, id: clusterId });
                    }}
                    onMouseLeave={() => {
                      setHoveredCluster(null);
                      setTooltip(null);
                    }}
                    style={{ transition: 'r 150ms ease-out' }}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x + 8}
              y={tooltip.y - 20}
              width={90}
              height={24}
              rx={4}
              fill="#1a2420"
              stroke="#2d4438"
              strokeWidth={1}
            />
            <text
              x={tooltip.x + 53}
              y={tooltip.y - 4}
              textAnchor="middle"
              fontSize={11}
              fontFamily="var(--font-mono)"
              fill="#e2e8e4"
            >
              {`Cluster ${tooltip.id}`}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
