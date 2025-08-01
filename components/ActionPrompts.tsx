

import React from 'react';
import { SecondaryAction } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { TrendingDownIcon } from './icons/TrendingDownIcon';
import { PlusIcon } from './icons/PlusIcon';

interface ActionPromptsProps {
  onSecondaryAction: (action: SecondaryAction) => void;
  onAddDataClick: () => void;
  disabled: boolean;
  showGeneralActions: boolean;
}

const ActionPrompts: React.FC<ActionPromptsProps> = ({ onSecondaryAction, onAddDataClick, disabled, showGeneralActions }) => {
    const baseClasses = "flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed";
    const secondaryButtonClasses = "bg-gray-700 hover:bg-gray-600 text-gray-200";

    const secondaryActions = [
        { action: 'generate_tiers' as SecondaryAction, label: 'Generate Tiers', icon: SparklesIcon, className: 'text-purple-300' },
        { action: 'find_sleepers' as SecondaryAction, label: 'Find Sleepers', icon: TrendingUpIcon, className: 'text-green-300' },
        { action: 'identify_busts' as SecondaryAction, label: 'Identify Busts', icon: TrendingDownIcon, className: 'text-red-300' },
    ];

  return (
    <div className="flex flex-wrap items-center gap-2">
        <button
            onClick={onAddDataClick}
            disabled={disabled}
            className={`${baseClasses} ${secondaryButtonClasses}`}
        >
            <PlusIcon className="h-5 w-5" />
            Add Data
        </button>

        {showGeneralActions && (
            <div className="h-6 w-px bg-gray-600 mx-2 hidden sm:block" />
        )}

        {showGeneralActions && secondaryActions.map(({ action, label, icon: Icon, className }) => (
            <button
                key={action}
                onClick={() => onSecondaryAction(action)}
                disabled={disabled}
                className={`${baseClasses} ${secondaryButtonClasses}`}
            >
                <Icon className={`h-5 w-5 ${className}`} />
                {label}
            </button>
        ))}
    </div>
  );
};

export default ActionPrompts;