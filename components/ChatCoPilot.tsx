import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { PlayCallAIIcon } from './icons/CoPilotIcon';

interface PlayCallAIChatProps {
  isVisible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isResponding: boolean;
}

const PlayCallAIChat: React.FC<PlayCallAIChatProps> = ({ isVisible, onClose, messages, onSendMessage, isResponding }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isResponding]);
  
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isResponding) {
      onSendMessage(input);
      setInput('');
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-0 mb-4 mr-4 w-[90vw] max-w-md h-[70vh] max-h-[600px] z-50 flex flex-col bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
            <PlayCallAIIcon className="h-6 w-6 text-blue-400" />
            <h3 className="text-lg font-bold text-white">PlayCall AI</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-sm rounded-lg px-4 py-2 ${
                msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-gray-700 text-gray-200 rounded-bl-none'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isResponding && (
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

      {/* Input Form */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data..."
            className="flex-1 w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isResponding}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isResponding}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default PlayCallAIChat;