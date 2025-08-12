
import React from 'react';
import { PostLoadAction } from '../types';
import { FileTextIcon } from './icons/FileTextIcon';
import { CircleDollarSignIcon } from './icons/CircleDollarSignIcon';
import { ArrowRightLeftIcon } from './icons/ArrowRightLeftIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';

interface InitialPromptUIProps {
    onSelect: (action: PostLoadAction) => void;
    selectedAction: PostLoadAction | null;
}

const actionButtons = [
    {
        action: 'tiers' as PostLoadAction,
        icon: FileTextIcon,
        iconClass: 'text-purple-400',
        title: 'Build Cheat Sheets',
        description: "Turn your data into draft ready cheat sheets with custom analysis and tiers.",
        ariaLabel: 'Build Cheat Sheets'
    },
    {
        action: 'faab' as PostLoadAction,
        icon: CircleDollarSignIcon,
        iconClass: 'text-green-400',
        title: 'Optimize Waiver Wire Bids',
        description: 'Discover personalized FAAB recommendations for free agents.',
        ariaLabel: 'Optimize Waiver Wire Bids'
    },
    {
        action: 'trade' as PostLoadAction,
        icon: ArrowRightLeftIcon,
        iconClass: 'text-blue-400',
        title: 'Analyze Trade Impact',
        description: 'Evaluate trade scenarios and their effect on your roster.',
        ariaLabel: 'Analyze Trade Impact'
    },
    {
        action: 'roster' as PostLoadAction,
        icon: ClipboardListIcon,
        iconClass: 'text-yellow-400',
        title: 'Get Roster Suggestions',
        description: 'Receive AI-driven lineup and bench advice for your team.',
        ariaLabel: 'Get Roster Suggestions'
    }
];


const InitialPromptUI: React.FC<InitialPromptUIProps> = ({ onSelect, selectedAction }) => {
    return (
        <div className="text-center pt-8 pb-4">
            <h2 className="text-xl font-bold text-white mb-2">How can PlayCall AI help you?</h2>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">Select a guided action below to get started.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {actionButtons.map(({ action, icon: Icon, iconClass, title, description, ariaLabel }) => {
                    const isSelected = selectedAction === action;
                    return (
                     <button
                        key={action}
                        onClick={() => onSelect(action)}
                        className={`group flex flex-col items-center justify-start text-center p-3 sm:p-4 bg-gray-900/50 rounded-xl border  hover:bg-gray-800/60 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 h-full
                            ${isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-700 hover:border-blue-500'}`}
                        aria-label={ariaLabel}
                        aria-pressed={isSelected}
                    >
                        <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${iconClass} mb-2 transition-transform group-hover:scale-110 flex-shrink-0`} />
                        <h3 className="text-sm sm:text-md font-semibold text-white mb-1 sm:mb-2">{title}</h3>
                        <p className="text-xs text-gray-400 leading-tight flex-grow">{description}</p>
                    </button>
                )})}
            </div>
        </div>
    );
};

export default InitialPromptUI;