import React from 'react';

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface SimpleLineChartProps {
  data: ChartData[];
  height?: number;
  showPoints?: boolean;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ 
  data, 
  height = 200,
  showPoints = true 
}) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500">
        Không có dữ liệu
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));
  const range = maxValue - minValue || 1;
  
  const width = 100; // percentage
  const stepX = width / (data.length - 1);
  
  // Generate SVG path
  const pathData = data.map((item, index) => {
    const x = index * stepX;
    const y = 100 - ((item.value - minValue) / range) * 80; // 80% of height for padding
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="relative" style={{ height }}>
      {/* Chart Area */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100"
        className="overflow-visible"
      >
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-sm"
        />
        
        {/* Points */}
        {showPoints && data.map((item, index) => {
          const x = index * stepX;
          const y = 100 - ((item.value - minValue) / range) * 80;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth="1"
              className="drop-shadow-sm"
            />
          );
        })}
      </svg>
      
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between mt-2">
        {data.map((item, index) => (
          <div key={index} className="text-xs text-gray-600 text-center" style={{ width: '60px' }}>
            {item.name}
          </div>
        ))}
      </div>
      
      {/* Y-axis values - positioned on the left */}
      <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-gray-600">
        <div>{maxValue}</div>
        <div>{Math.round((maxValue + minValue) / 2)}</div>
        <div>{minValue}</div>
      </div>
    </div>
  );
};

export default SimpleLineChart;