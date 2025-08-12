import React, { useState, useEffect, useRef } from 'react';
import { AggregatedPlayer, SortConfig, HeaderConfig } from '../types';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface PlayerTableProps {
  players: AggregatedPlayer[];
  headers: HeaderConfig[];
  sortConfig: SortConfig;
  requestSort: (key: string) => void;
  editingHeader: string | null;
  setEditingHeader: (key: string | null) => void;
  onHeaderLabelChange: (key: string, newLabel: string) => void;
}

const EditableHeader: React.FC<{
    header: HeaderConfig;
    isEditing: boolean;
    onStartEdit: (key: string | null) => void;
    onLabelChange: (key: string, newLabel: string) => void;
}> = ({ header, isEditing, onStartEdit, onLabelChange }) => {
    const [label, setLabel] = useState(header.label);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setLabel(header.label);
    }, [header.label]);

    const handleCommit = () => {
        if (label.trim()) {
            onLabelChange(header.key, label);
        } else {
            onLabelChange(header.key, header.label);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleCommit();
        } else if (e.key === 'Escape') {
            setLabel(header.label);
            onStartEdit(null);
        }
    }

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleCommit}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-600 border border-blue-500 rounded px-1 py-0.5 text-white"
            />
        );
    }

    return (
        <span onDoubleClick={() => onStartEdit(header.key)}>{header.label}</span>
    );
};


const PlayerTable: React.FC<PlayerTableProps> = ({ players, headers, sortConfig, requestSort, editingHeader, setEditingHeader, onHeaderLabelChange }) => {
  const BASE_PLAYER_PROPS = ['snakeRank', 'name', 'position', 'team', 'bye', 'aiTier', 'faabRec'];

  return (
    <div className="overflow-auto rounded-lg border border-gray-700 h-[75vh]">
      <table className="min-w-full divide-y divide-gray-700 relative">
        <thead className="bg-gray-800 sticky top-0 z-30">
          <tr>
            {headers.map((header) => {
              const stickyClass = 
                header.key === 'snakeRank' ? 'sticky left-0 z-20' : 
                header.key === 'name' ? 'sticky left-[125px] z-20' : '';
              
              const isEditable = !BASE_PLAYER_PROPS.includes(header.key);
              
              return (
                <th
                  key={header.key}
                  scope="col"
                  className={`px-4 py-3.5 text-left text-sm font-semibold text-gray-300 bg-gray-800 ${stickyClass} ${header.sortable ? 'cursor-pointer hover:bg-gray-700' : ''}`}
                  onClick={header.sortable ? () => requestSort(header.key) : undefined}
                  title={isEditable ? 'Double-click header to edit' : 'This column is not editable'}
                >
                  <div className="flex items-center gap-2">
                    {isEditable ? (
                      <EditableHeader 
                          header={header}
                          isEditing={editingHeader === header.key}
                          onStartEdit={setEditingHeader}
                          onLabelChange={onHeaderLabelChange}
                      />
                    ) : (
                      <span>{header.label}</span>
                    )}
                    {header.sortable && sortConfig.key === header.key && (
                      sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-gray-900/50">
          {players.map(player => {
            const playerKey = player.name + player.team + Object.values(player.ranks).join('-'); 
            return (
              <tr key={playerKey} className="hover:bg-gray-700/50 transition-colors group">
                {headers.map(header => {
                  const isSticky = header.key === 'snakeRank' || header.key === 'name';
                  
                  const stickyClass = 
                    header.key === 'snakeRank' ? 'sticky left-0 z-10' : 
                    header.key === 'name' ? 'sticky left-[125px] z-10' : '';
                  
                  const stickyBgClass = isSticky ? 'bg-gray-900/50 group-hover:bg-gray-700/50' : '';

                  const isRankKey = !BASE_PLAYER_PROPS.includes(header.key);
                  const value = isRankKey ? player.ranks[header.key] : player[header.key as keyof Omit<AggregatedPlayer, 'ranks'>];

                  let displayValue: React.ReactNode = '-';
                  if (value != null) {
                      if (header.key === 'snakeRank' && value !== Infinity) {
                          displayValue = (Math.round(Number(value) * 10) / 10).toFixed(1);
                      } else if (value !== Infinity) {
                          displayValue = String(value);
                      }
                  }

                  return (
                    <td 
                        key={header.key}
                        className={`whitespace-nowrap px-4 py-4 text-sm text-gray-400 ${stickyBgClass} ${stickyClass}
                            ${header.key === 'snakeRank' ? 'font-bold text-cyan-400' : ''}
                            ${header.key === 'name' ? 'font-medium text-gray-200' : ''}
                            ${header.key === 'aiTier' ? 'font-bold text-purple-400 text-center' : ''}
                            ${header.key === 'faabRec' ? 'font-bold text-green-400 text-center' : ''}`}
                    >
                        {displayValue}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerTable;