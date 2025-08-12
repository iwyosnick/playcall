

import React, { Fragment } from 'react';
import { TradeAnalysis, TextAnalysis } from '../types';

interface AnalysisResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tradeResult: TradeAnalysis | null;
  textResult: TextAnalysis | null;
}

const AnalysisResultModal: React.FC<AnalysisResultModalProps> = ({
  isOpen,
  onClose,
  title,
  tradeResult,
  textResult,
}) => {
  if (!isOpen) return null;

  const hasSources = textResult?.sources && textResult.sources.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg border border-gray-700 transform transition-all">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="text-gray-300 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {tradeResult && (
              <>
                <div className="flex justify-between items-baseline bg-gray-900/50 p-4 rounded-lg">
                  <span className="text-lg font-semibold text-gray-300">Trade Grade:</span>
                  <span className="text-3xl font-bold text-blue-400">{tradeResult.grade}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white mb-2">Reasoning:</h3>
                  <p className="whitespace-pre-wrap">{tradeResult.reasoning}</p>
                </div>
              </>
            )}
            {textResult && (
              <div>
                <p className="whitespace-pre-wrap">{textResult.advice}</p>
              </div>
            )}
            {hasSources && (
                <div className="pt-4 border-t border-gray-700">
                    <h3 className="font-semibold text-md text-white mb-2">Sources:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        {textResult.sources?.map((source, index) => (
                            <li key={index}>
                                <a 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 hover:underline"
                                    title={source.uri}
                                >
                                    {source.title || new URL(source.uri).hostname}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        </div>
        <div className="bg-gray-900/50 px-6 py-4 rounded-b-2xl text-right">
           <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResultModal;