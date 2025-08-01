
import React, { useRef } from 'react';
import { PlusIcon } from './icons/PlusIcon';
import { SendHorizonalIcon } from './icons/SendHorizonalIcon';

interface ContentInputFormProps {
  text: string;
  setText: (text: string) => void;
  onSubmit: (text: string) => void;
  isLoading: boolean;
  placeholder: string;
}

const ContentInputForm: React.FC<ContentInputFormProps> = ({ text, setText, onSubmit, isLoading, placeholder }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
        onSubmit(text);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1000000) { // 1MB limit
        alert('File is too large. Please use a file under 1MB.');
        return;
      }
      if (file.type !== 'text/plain' && file.type !== 'text/csv') {
        alert('Invalid file type. Please upload a .txt or .csv file.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        setText(fileContent);
      };
      reader.onerror = () => {
        alert('Failed to read file.');
      }
      reader.readAsText(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSubmit(e);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <div className="relative">
        <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-48 p-4 pr-24 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            disabled={isLoading}
            aria-label="Primary data input area"
        ></textarea>
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,.csv"
                disabled={isLoading}
            />
             <button
                type="button"
                onClick={handleUploadClick}
                disabled={isLoading}
                className="p-2 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label="Upload file"
            >
                <PlusIcon className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Analyze data"
            >
                {isLoading ? 
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> :
                    <SendHorizonalIcon className="w-5 h-5" />
                }
            </button>
        </div>
      </div>
    </form>
  );
};

export default ContentInputForm;
