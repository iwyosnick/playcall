import React, { useState } from 'react';
import { ClarificationRequest, ClarificationAnswers } from '../types';

interface ClarificationFormProps {
  questions: ClarificationRequest;
  onSubmit: (answers: ClarificationAnswers) => void;
  isLoading: boolean;
}

const ClarificationForm: React.FC<ClarificationFormProps> = ({ questions, onSubmit, isLoading }) => {
  const [answers, setAnswers] = useState<ClarificationAnswers>({});
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (questions.source && !answers.source?.trim()) {
        setError("Please provide a source name.");
        return;
    }
    onSubmit(answers);
  };

  const handleInputChange = (key: keyof ClarificationAnswers, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const renderQuestion = (key: string, questionText: string) => {
    switch (key) {
      case 'source':
        return (
          <div key={key}>
            <label htmlFor={key} className="block text-sm font-medium text-gray-300 mb-2">{questionText}</label>
            <input
              type="text"
              id={key}
              name={key}
              value={answers.source || ''}
              onChange={(e) => handleInputChange('source', e.target.value)}
              placeholder="e.g., My Draft Sheet, Player Rankings 2024"
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              aria-required="true"
            />
          </div>
        );
      case 'draftType':
        return (
          <div key={key}>
             <label className="block text-sm font-medium text-gray-300 mb-2">{questionText}</label>
             <div className="flex gap-4">
                <label className="flex items-center space-x-2 text-gray-200">
                    <input type="radio" name={key} value="Snake" onChange={(e) => handleInputChange('draftType', e.target.value as 'Snake' | 'Salary Cap')} className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                    <span>Snake</span>
                </label>
                 <label className="flex items-center space-x-2 text-gray-200">
                    <input type="radio" name={key} value="Salary Cap" onChange={(e) => handleInputChange('draftType', e.target.value as 'Snake' | 'Salary Cap')} className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                    <span>Salary Cap</span>
                </label>
             </div>
          </div>
        );
      case 'scoringFormat':
          return (
            <div key={key}>
                <label htmlFor={key} className="block text-sm font-medium text-gray-300 mb-2">{questionText}</label>
                <input
                    type="text"
                    id={key}
                    name={key}
                    value={answers.scoringFormat || ''}
                    onChange={(e) => handleInputChange('scoringFormat', e.target.value)}
                    placeholder="e.g., PPR, Half-PPR, Standard"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
          );
      default:
        return null;
    }
  };

  return (
    <div className="bg-blue-900/20 border border-blue-500 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-4">Clarification Needed</h3>
        <p className="text-gray-300 mb-6">The AI needs more information to process your request accurately.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {Object.entries(questions).map(([key, value]) => renderQuestion(key, value))}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto self-center sm:self-end flex justify-center items-center px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
                {isLoading ? 'Processing...' : 'Submit Answers'}
            </button>
        </form>
    </div>
  );
};

export default ClarificationForm;