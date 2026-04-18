import './ConfidenceRing.css';

interface ConfidenceRingProps {
  confidence: number; // 0-100
  size?: number;
}

export function ConfidenceRing({ confidence, size = 64 }: ConfidenceRingProps) {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  const getColor = (conf: number): string => {
    if (conf >= 85) return '#10b981'; // green
    if (conf >= 65) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="confidence-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-bright)" strokeWidth="2" />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(confidence)}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>

      {/* Text overlay */}
      <div className="confidence-text">{confidence}%</div>
    </div>
  );
}
