
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { PlayCallAIIcon } from './icons/CoPilotIcon';
import { SendHorizonalIcon } from './icons/SendHorizonalIcon';
import ContentInputForm from './UrlInputForm';

interface PlayCallAIChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isResponding: boolean;
  isAddingData: boolean;
  onDataSubmit: (text: string) => void;
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  imageBase64: string | null;
  setImageBase64: (base64: string | null) => void;
  setImageMimeType: (mimeType: string | null) => void;
}

const PlayCallAIChat: React.FC<PlayCallAIChatProps> = ({ 
    messages, 
    onSendMessage, 
    isResponding,
    isAddingData,
    onDataSubmit,
    inputText,
    setInputText,
    isLoading,
    imageBase64,
    setImageBase64,
    setImageMimeType
}) => {
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isResponding]);
  
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !isResponding) {
      onSendMessage(chatInput);
      setChatInput('');
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
      if (!isResponding) {
          onSendMessage(suggestion);
      }
  };

  return (
    <div className="flex flex-col bg-gray-800/50 border border-gray-700 rounded-2xl shadow-2xl h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
            <PlayCallAIIcon className="h-7 w-7 text-blue-400" />
            <h3 className="text-lg font-bold text-white">PlayCall AI</h3>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-xs md:max-w-sm rounded-lg px-4 py-2 ${
                msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-gray-700 text-gray-200 rounded-bl-none'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.suggestions && msg.suggestions.length > 0 && msg.role === 'model' && (
                <div className="mt-2.5 flex flex-col items-start gap-2 w-full max-w-sm">
                    {msg.suggestions.map((suggestion, i) => (
                        <button 
                            key={i}
                            onClick={() => handleSuggestionClick(suggestion)}
                            disabled={isResponding}
                            className="text-left text-sm text-blue-300 bg-gray-900/40 hover:bg-gray-900/70 border border-gray-700/80 px-3.5 py-2 rounded-lg w-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
          </div>
        ))}
        {isResponding && !isAddingData && (
            <div className="flex justify-start">
                <div className="max-w-xs md:max-w-sm rounded-lg px-4 py-2 bg-gray-700 text-gray-200 rounded-bl-none">
                    <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0">
        {isAddingData ? (
            <div className="p-4 border-t border-gray-700">
                <ContentInputForm
                    text={inputText}
                    setText={setInputText}
                    onSubmit={onDataSubmit}
                    isLoading={isLoading}
                    placeholder="Paste your next data source here..."
                    imageBase64={imageBase64}
                    setImageBase64={setImageBase64}
                    setImageMimeType={setImageMimeType}
                />
            </div>
        ) : (
            <div className="p-4 border-t border-gray-700">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a follow-up..."
                    className="flex-1 w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isResponding}
                />
                <button 
                    type="submit" 
                    disabled={!chatInput.trim() || isResponding}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send message"
                >
                    <SendHorizonalIcon className="w-5 h-5" />
                </button>
                </form>
            </div>
        )}
      </div>
    </div>
  );
};

export default PlayCallAIChat;
