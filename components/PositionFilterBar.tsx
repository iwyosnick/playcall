

import React from 'react';

interface PositionFilterBarProps {
  availablePositions: string[];
  activeFilters: string[];
  onFilterChange: (position: string) => void;
}

const PositionFilterBar: React.FC<PositionFilterBarProps> = ({ availablePositions, activeFilters, onFilterChange }) => {
  if (availablePositions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {availablePositions.map(pos => {
        const isActive = activeFilters.includes(pos);
        return (
          <button
            key={pos}
            onClick={() => onFilterChange(pos)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors
                ${isActive 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600'
                }
            `}
            aria-pressed={isActive}
          >
            {pos}
          </button>
        );
      })}
    </div>
  );
};

export default PositionFilterBar;