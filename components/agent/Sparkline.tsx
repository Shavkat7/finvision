"use client";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeColor?: string;
  fillColor?: string;
}

export function Sparkline({
  values,
  width = 280,
  height = 56,
  className = "",
  strokeColor = "currentColor",
  fillColor,
}: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathLine = "M " + points.join(" L ");
  const pathFill = pathLine + ` L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      preserveAspectRatio="none"
    >
      {fillColor && (
        <path d={pathFill} fill={fillColor} fillOpacity="0.2" />
      )}
      <path
        d={pathLine}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
