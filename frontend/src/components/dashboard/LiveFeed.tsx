import { Alert } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import './LiveFeed.css';

interface LiveFeedProps {
  alerts: Alert[];
}

export function LiveFeed({ alerts }: LiveFeedProps) {
  return (
    <div className="live-feed">
      <div className="feed-header">
        <h3 className="feed-title">LIVE ALERT FEED</h3>
        <span className="feed-live-indicator">● LIVE</span>
      </div>

      <div className="feed-items">
        {alerts.slice(0, 10).map((alert) => (
          <div key={alert.id} className="feed-item">
            <div className="feed-item-left">
              <SeverityBadge severity={alert.severity} />
            </div>
            <div className="feed-item-middle">
              <div className="feed-item-title">{alert.title}</div>
              <div className="feed-item-source">{alert.source}</div>
            </div>
            <div className="feed-item-right">
              <div className="feed-item-time">now</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
