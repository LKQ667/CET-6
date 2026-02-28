"use client";

interface WeaknessRadarProps {
  listening: number;
  reading: number;
  writingTranslation: number;
}

function normalize(value: number) {
  const max = 250;
  return Math.max(0.12, Math.min(value / max, 1));
}

export function WeaknessRadar({ listening, reading, writingTranslation }: WeaknessRadarProps) {
  const center = 110;
  const radius = 90;
  const values = [
    normalize(listening),
    normalize(reading),
    normalize(writingTranslation)
  ];

  const points = values.map((rate, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 3;
    const x = center + Math.cos(angle) * radius * rate;
    const y = center + Math.sin(angle) * radius * rate;
    return `${x},${y}`;
  });

  return (
    <svg viewBox="0 0 220 220" className="radar">
      <polygon points="110,20 189,155 31,155" className="radar-grid" />
      <polygon points="110,50 165,145 55,145" className="radar-grid-inner" />
      <polygon points={points.join(" ")} className="radar-shape" />
      <circle cx="110" cy="20" r="4" className="radar-dot" />
      <circle cx="189" cy="155" r="4" className="radar-dot" />
      <circle cx="31" cy="155" r="4" className="radar-dot" />
      <text x="110" y="14" textAnchor="middle" className="radar-label">
        听力
      </text>
      <text x="196" y="170" textAnchor="middle" className="radar-label">
        阅读
      </text>
      <text x="24" y="170" textAnchor="middle" className="radar-label">
        写译
      </text>
    </svg>
  );
}

