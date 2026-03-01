import { useState, useCallback } from 'react';

export interface ChartPoint { label: string; value: number }

interface Props {
  data:       ChartPoint[];
  color:      string;          // neon line colour, e.g. '#ff00aa'
  id:         string;          // unique per chart – used for SVG def IDs
  formatY:    (v: number) => string;
}

export function SynthLineChart({ data, color, id, formatY }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // SVG virtual canvas
  const VW = 500;
  const VH = 200;
  const PL = 56, PR = 14, PT = 16, PB = 30;
  const CW = VW - PL - PR;
  const CH = VH - PT - PB;

  const vals   = data.map(d => d.value);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const pad    = (rawMax - rawMin) * 0.1 || rawMax * 0.1;
  const minY   = rawMin - pad;
  const maxY   = rawMax + pad;

  const toX = (i: number) => PL + (i / (data.length - 1)) * CW;
  const toY = (v: number) => PT + (1 - (v - minY) / (maxY - minY)) * CH;

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));

  // Smooth cubic bezier path
  const linePath = pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      const prev = pts[i - 1];
      const cx1  = prev.x + (p.x - prev.x) * 0.5;
      const cx2  = p.x   - (p.x - prev.x) * 0.5;
      return `C ${cx1.toFixed(1)} ${prev.y.toFixed(1)}, ${cx2.toFixed(1)} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(' ');

  const areaPath =
    linePath +
    ` L ${pts[pts.length - 1].x.toFixed(1)} ${(PT + CH).toFixed(1)}` +
    ` L ${pts[0].x.toFixed(1)} ${(PT + CH).toFixed(1)} Z`;

  // Y-axis ticks (5 levels)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    v: minY + t * (maxY - minY),
    y: PT + (1 - t) * CH,
  }));

  // X-axis labels — at most 6 evenly spaced
  const xStep = Math.max(1, Math.floor((data.length - 1) / 5));

  // Hover detection: map SVG-viewBox X from mouse event
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect  = e.currentTarget.getBoundingClientRect();
      const svgX  = ((e.clientX - rect.left) / rect.width) * VW;
      let best = 0, bestDist = Infinity;
      pts.forEach((p, i) => {
        const d = Math.abs(p.x - svgX);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setHoverIdx(best);
    },
    [pts],
  );

  const hp   = hoverIdx !== null ? pts[hoverIdx]   : null;
  const hd   = hoverIdx !== null ? data[hoverIdx]  : null;
  const last = pts[pts.length - 1];

  // Tooltip: flip left/right and up/down to stay in bounds
  const ttW  = 104, ttH = 42;
  const ttX  = hp ? (hp.x + 12 + ttW > VW - PR ? hp.x - ttW - 8 : hp.x + 12) : 0;
  const ttY  = hp ? (hp.y - ttH - 6 < PT       ? hp.y + 8        : hp.y - ttH - 6) : 0;

  const gradId  = `${id}-grad`;
  const glowId  = `${id}-glow`;
  const clipId  = `${id}-clip`;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full select-none"
      style={{ height: VH, cursor: 'crosshair' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <defs>
        {/* Area fill gradient */}
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>

        {/* Neon glow filter */}
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        {/* Clip chart area */}
        <clipPath id={clipId}>
          <rect x={PL} y={PT} width={CW} height={CH} />
        </clipPath>
      </defs>

      {/* Chart background */}
      <rect x={PL} y={PT} width={CW} height={CH} fill="rgba(18,0,36,0.35)" rx="3" />

      {/* Y grid lines + labels */}
      {yTicks.map(({ y, v }, i) => (
        <g key={i}>
          <line
            x1={PL} y1={y} x2={VW - PR} y2={y}
            stroke="rgba(130,0,200,0.18)" strokeWidth="1" strokeDasharray="3 4"
          />
          <text
            x={PL - 5} y={y + 4}
            textAnchor="end" fill="rgba(180,120,255,0.65)"
            fontSize="9" fontFamily="monospace"
          >
            {formatY(v)}
          </text>
        </g>
      ))}

      {/* X labels */}
      {data.map((d, i) => {
        if (i % xStep !== 0 && i !== data.length - 1) return null;
        return (
          <text
            key={i} x={toX(i)} y={VH - 4}
            textAnchor="middle" fill="rgba(180,120,255,0.5)"
            fontSize="9" fontFamily="monospace"
          >
            {d.label}
          </text>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />

      {/* Glow copy of line */}
      <path
        d={linePath} fill="none"
        stroke={color} strokeWidth="4" strokeOpacity="0.32"
        filter={`url(#${glowId})`} clipPath={`url(#${clipId})`}
      />

      {/* Main line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" clipPath={`url(#${clipId})`} />

      {/* Always-visible last-point dot */}
      {(hoverIdx === null || hoverIdx !== data.length - 1) && (
        <>
          <circle cx={last.x} cy={last.y} r="5"
            fill={color} opacity="0.4" filter={`url(#${glowId})`} />
          <circle cx={last.x} cy={last.y} r="2.8" fill={color} />
          <circle cx={last.x} cy={last.y} r="1.3" fill="#fff" />
        </>
      )}

      {/* Hover crosshair + tooltip */}
      {hp && hd && (
        <g>
          {/* Vertical indicator */}
          <line
            x1={hp.x} y1={PT} x2={hp.x} y2={PT + CH}
            stroke={color} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3"
          />
          {/* Dot */}
          <circle cx={hp.x} cy={hp.y} r="5.5"
            fill={color} opacity="0.35" filter={`url(#${glowId})`} />
          <circle cx={hp.x} cy={hp.y} r="3.2" fill={color} />
          <circle cx={hp.x} cy={hp.y} r="1.5" fill="#fff" />

          {/* Tooltip */}
          <rect
            x={ttX} y={ttY} width={ttW} height={ttH} rx="4"
            fill="rgba(12,0,26,0.94)" stroke={color} strokeWidth="0.8" strokeOpacity="0.7"
          />
          <text
            x={ttX + 8} y={ttY + 14}
            fill="rgba(200,150,255,0.75)" fontSize="9" fontFamily="monospace"
          >
            {hd.label}
          </text>
          <text
            x={ttX + 8} y={ttY + 30}
            fill="#fff" fontSize="11.5" fontFamily="monospace" fontWeight="bold"
          >
            {formatY(hd.value)}
          </text>
        </g>
      )}
    </svg>
  );
}
