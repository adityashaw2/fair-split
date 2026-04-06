import { motion } from "framer-motion";
import type { GameConfig, Prices, RoundData } from "@/lib/types";
import { ROOM_COLORS } from "@/lib/constants";

interface Props {
  rounds: RoundData[];
  config: GameConfig;
  finalPrices: Prices;
}

/**
 * Visualize the rent simplex as an equilateral triangle.
 *
 * Each vertex represents one room costing the full rent.
 * A point inside the triangle represents a price split:
 *   - Distance from vertex i ∝ price of room i
 *
 * We plot the path of prices through rounds, converging
 * to the envy-free solution.
 */
export function TriangleViz({ rounds, config, finalPrices }: Props) {
  const R = config.totalRent;
  const size = 280;
  const pad = 40;
  const w = size + pad * 2;
  const h = (size * Math.sqrt(3)) / 2 + pad * 2;

  // Triangle vertices (equilateral, top-center orientation)
  const V = [
    { x: w / 2, y: pad }, // Top: Room A = 100%
    { x: pad, y: h - pad }, // Bottom-left: Room B = 100%
    { x: w - pad, y: h - pad }, // Bottom-right: Room C = 100%
  ];

  // Convert prices to barycentric coordinates → 2D point
  const toPoint = (prices: Prices) => {
    const [a, b, c] = prices.map((p) => p / R);
    return {
      x: a * V[0].x + b * V[1].x + c * V[2].x,
      y: a * V[0].y + b * V[1].y + c * V[2].y,
    };
  };

  const points = rounds.map((r) => toPoint(r.prices));
  const finalPoint = toPoint(finalPrices);

  // Build SVG path
  const pathD =
    points.length > 1
      ? `M ${points[0].x} ${points[0].y} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(" ")
      : "";

  return (
    <div className="bg-surface rounded-xl border border-border p-4 flex justify-center">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[300px]">
        {/* Triangle edges */}
        <polygon
          points={V.map((v) => `${v.x},${v.y}`).join(" ")}
          fill="none"
          stroke="var(--color-border-light)"
          strokeWidth="1"
        />

        {/* Grid lines (thirds) */}
        {[1 / 3, 2 / 3].map((t) => (
          <g key={t} opacity={0.15}>
            <line
              x1={V[0].x + (V[1].x - V[0].x) * t}
              y1={V[0].y + (V[1].y - V[0].y) * t}
              x2={V[0].x + (V[2].x - V[0].x) * t}
              y2={V[0].y + (V[2].y - V[0].y) * t}
              stroke="var(--color-border-light)"
              strokeWidth="0.5"
            />
            <line
              x1={V[1].x + (V[0].x - V[1].x) * t}
              y1={V[1].y + (V[0].y - V[1].y) * t}
              x2={V[1].x + (V[2].x - V[1].x) * t}
              y2={V[1].y + (V[2].y - V[1].y) * t}
              stroke="var(--color-border-light)"
              strokeWidth="0.5"
            />
            <line
              x1={V[2].x + (V[0].x - V[2].x) * t}
              y1={V[2].y + (V[0].y - V[2].y) * t}
              x2={V[2].x + (V[1].x - V[2].x) * t}
              y2={V[2].y + (V[1].y - V[2].y) * t}
              stroke="var(--color-border-light)"
              strokeWidth="0.5"
            />
          </g>
        ))}

        {/* Convergence path */}
        {pathD && (
          <motion.path
            d={pathD}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.6}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        )}

        {/* Round dots */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 3}
            fill={
              i === points.length - 1
                ? "var(--color-accent)"
                : "var(--color-text-muted)"
            }
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.15 }}
          />
        ))}

        {/* Final point highlight */}
        <motion.circle
          cx={finalPoint.x}
          cy={finalPoint.y}
          r={8}
          fill="var(--color-accent)"
          opacity={0.2}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ delay: 1, duration: 0.6 }}
        />

        {/* Vertex labels */}
        {config.rooms.map((room, i) => {
          const color = ROOM_COLORS[i];
          const labelOffset = [
            { dx: 0, dy: -12 },
            { dx: -8, dy: 16 },
            { dx: 8, dy: 16 },
          ][i];
          return (
            <text
              key={i}
              x={V[i].x + labelOffset.dx}
              y={V[i].y + labelOffset.dy}
              textAnchor="middle"
              fill={color.accent}
              fontSize="11"
              fontWeight="600"
            >
              {room.name}
            </text>
          );
        })}

        {/* Equal split marker */}
        <circle
          cx={(V[0].x + V[1].x + V[2].x) / 3}
          cy={(V[0].y + V[1].y + V[2].y) / 3}
          r="2"
          fill="var(--color-border-light)"
          opacity={0.5}
        />
      </svg>
    </div>
  );
}
