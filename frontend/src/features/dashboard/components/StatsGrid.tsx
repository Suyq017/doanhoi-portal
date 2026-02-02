/**
 * StatsGrid - Grid layout for statistics cards
 */

import React from 'react';
import { StatCard } from './StatCard';
import { StatsCardData } from '../types';

export interface StatsGridProps {
  stats: StatsCardData[];
  columns?: 1 | 2 | 3 | 4;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, columns = 4 }) => {
  const gridColsClass = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  }[columns];

  return (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${gridColsClass}`}>
      {stats.map((stat) => (
        <StatCard
          key={stat.name}
          name={stat.name}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
        />
      ))}
    </div>
  );
};

export default StatsGrid;
