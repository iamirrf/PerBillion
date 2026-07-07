import React from 'react';

interface ProgressRingProps {
  size: number;
  progress: number; // 0-100
  strokeWidth: number;
  showLabel?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ 
  size, 
  progress, 
  strokeWidth,
  showLabel = false 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  // Determine color based on progress
  const getColor = () => {
    if (progress >= 90) return '#10b981'; // green-500
    if (progress >= 70) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-700"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {/* Label */}
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color: getColor() }}>
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
