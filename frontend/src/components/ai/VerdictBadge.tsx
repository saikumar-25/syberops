import { Verdict } from '../../types';
import './VerdictBadge.css';

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
}

export function VerdictBadge({ verdict, size = 'md' }: VerdictBadgeProps) {
  if (!verdict) {
    return <div className={`verdict-badge verdict-pending size-${size}`}>⚙️ ANALYZING</div>;
  }

  switch (verdict) {
    case 'TRUE_POSITIVE':
      return (
        <div className={`verdict-badge verdict-true-positive size-${size}`}>
          ✓ TRUE POS
        </div>
      );
    case 'FALSE_POSITIVE':
      return (
        <div className={`verdict-badge verdict-false-positive size-${size}`}>
          ✗ FALSE POS
        </div>
      );
    case 'SUSPICIOUS':
      return (
        <div className={`verdict-badge verdict-suspicious size-${size}`}>
          ⚠ SUSPICIOUS
        </div>
      );
    default:
      return null;
  }
}
