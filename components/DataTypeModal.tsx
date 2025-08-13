import React from 'react';
import { DataTypeDetection, DraftType } from '../types';

interface DataTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: DataTypeDetection;
  onDataTypeChoice: (choice: DraftType) => void;
}

const DataTypeModal: React.FC<DataTypeModalProps> = ({
  isOpen,
  onClose,
  dataType,
  onDataTypeChoice
}) => {
  if (!isOpen) return null;

  const handleChoice = (choice: DraftType) => {
    onDataTypeChoice(choice);
    onClose();
  };

  const getChoiceDescription = (type: DraftType) => {
    switch (type) {
      case 'snake':
        return 'Traditional snake draft rankings (1st, 2nd, 3rd pick order)';
      case 'salary_cap':
        return 'Auction/salary cap draft values (dollar amounts)';
      case 'mixed':
        return 'Process both types and let me choose which to display';
      default:
        return 'Let the AI determine the best approach';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Data Type Detection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-300 mb-3">
            I detected the following in your data:
          </p>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${dataType.hasSnakeRankings ? 'bg-green-500' : 'bg-gray-500'}`}></span>
              <span>Snake Draft Rankings: {dataType.hasSnakeRankings ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${dataType.hasSalaryCapValues ? 'bg-green-500' : 'bg-gray-500'}`}></span>
              <span>Salary Cap Values: {dataType.hasSalaryCapValues ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div className="mt-3 p-3 bg-gray-700 rounded">
            <p className="text-sm text-gray-300">
              <strong>AI Analysis:</strong> {dataType.reasoning}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Confidence: {dataType.confidence}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-white">How would you like to process this data?</h3>
          
          {dataType.hasSnakeRankings && (
            <button
              onClick={() => handleChoice('snake')}
              className="w-full p-3 text-left bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
            >
              <div className="font-medium">Snake Draft Rankings</div>
              <div className="text-sm text-blue-200">{getChoiceDescription('snake')}</div>
            </button>
          )}

          {dataType.hasSalaryCapValues && (
            <button
              onClick={() => handleChoice('salary_cap')}
              className="w-full p-3 text-left bg-green-600 hover:bg-green-700 rounded text-white transition-colors"
            >
              <div className="font-medium">Salary Cap Draft Values</div>
              <div className="text-sm text-green-200">{getChoiceDescription('salary_cap')}</div>
            </button>
          )}

          {dataType.hasSnakeRankings && dataType.hasSalaryCapValues && (
            <button
              onClick={() => handleChoice('mixed')}
              className="w-full p-3 text-left bg-purple-600 hover:bg-purple-700 rounded text-white transition-colors"
            >
              <div className="font-medium">Process Both Types</div>
              <div className="text-sm text-purple-200">{getChoiceDescription('mixed')}</div>
            </button>
          )}

          <button
            onClick={() => handleChoice('unknown')}
            className="w-full p-3 text-left bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
          >
            <div className="font-medium">Let AI Decide</div>
            <div className="text-sm text-gray-300">{getChoiceDescription('unknown')}</div>
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          <p>💡 <strong>Tip:</strong> Snake draft rankings are best for traditional drafts, while salary cap values are ideal for auction drafts.</p>
        </div>
      </div>
    </div>
  );
};

export default DataTypeModal;
