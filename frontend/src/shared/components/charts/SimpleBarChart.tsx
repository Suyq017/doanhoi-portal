import React from 'react';

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: ChartData[];
  maxValue?: number;
  height?: number;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ 
  data, 
  maxValue,
  height = 200 
}) => {
  const maxVal = maxValue || Math.max(...data.map(item => item.value));
  
  return (
    <div className="space-y-3" style={{ height }}>
      {data.map((item, index) => {
        const barWidth = (item.value / maxVal) * 100;
        const color = item.color || `hsl(${(index * 60) % 360}, 70%, 50%)`;
        
        return (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-20 text-xs text-gray-600 text-right flex-shrink-0">
              {item.name}
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
              <div
                className="h-6 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                style={{ 
                  width: `${barWidth}%`,
                  backgroundColor: color
                }}
              >
                <span className="text-xs font-medium text-white">
                  {item.value}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SimpleBarChart;