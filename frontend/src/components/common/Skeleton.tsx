import './Skeleton.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  circle?: boolean;
  count?: number;
}

export function Skeleton({ width = '100%', height = '20px', circle = false, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${circle ? 'skeleton-circle' : ''}`}
          style={{ width, height }}
        />
      ))}
    </>
  );
}
