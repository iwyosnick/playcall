
import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon } from './icons/PlusIcon';
import { SendHorizonalIcon } from './icons/SendHorizonalIcon';
import { CloseIcon } from './icons/CloseIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { CameraIcon } from './icons/CameraIcon';

interface ContentInputFormProps {
  text: string;
  setText: (text: string) => void;
  onSubmit: (text: string) => void;
  isLoading: boolean;
  placeholder: string;
  imageBase64: string | null;
  setImageBase64: (base64: string | null) => void;
  setImageMimeType: (mimeType: string | null) => void;
}

const ContentInputForm: React.FC<ContentInputFormProps> = ({ text, setText, onSubmit, isLoading, placeholder, imageBase64, setImageBase64, setImageMimeType }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isUploadOptionsOpen, setIsUploadOptionsOpen] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() || imageBase64) {
        onSubmit(text);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        alert('File is too large. Please use a file under 4MB.');
        return;
      }
      
      const reader = new FileReader();
      
      if (file.type.startsWith('image/')) {
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setImageBase64(result);
          setImageMimeType(file.type);
          setText(''); // Clear text when image is uploaded
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'text/plain' || file.type === 'text/csv') {
        reader.onload = (e) => {
          const fileContent = e.target?.result as string;
          setText(fileContent);
          setImageBase64(null); // Clear image when text is uploaded
          setImageMimeType(null);
        };
        reader.readAsText(file);
      } else {
        alert('Invalid file type. Please upload a .txt, .csv, or image file (png, jpg, etc).');
        return;
      }
      
      reader.onerror = () => {
        alert('Failed to read file.');
      }
    }
     // After file is processed, make sure to close the modal if it was open
    setIsUploadOptionsOpen(false);
  };

  const handleUploadClick = () => {
    if (isMobile) {
      setIsUploadOptionsOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };
  
  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
    setIsUploadOptionsOpen(false);
  };
  
  const handleTriggerImageInput = () => {
    imageInputRef.current?.click();
    setIsUploadOptionsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSubmit(e);
    }
  }

  return (
    <>
    <form id="content-input-form" onSubmit={handleSubmit}>
      {imageBase64 && (
        <div className="relative mb-4 w-fit mx-auto">
            <img src={imageBase64} alt="Upload preview" className="rounded-lg max-h-60 w-auto shadow-lg" />
            <button 
                type="button" 
                onClick={() => { setImageBase64(null); setImageMimeType(null); }}
                className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1.5 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                aria-label="Remove image"
            >
                <CloseIcon className="w-4 h-4" />
            </button>
        </div>
      )}
      <div className="relative">
        <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-32 p-4 pr-24 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            disabled={isLoading}
            aria-label="Primary data input area"
        ></textarea>
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {/* General file input for desktop and as a fallback */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,.csv,image/png,image/jpeg,image/webp,image/gif"
                disabled={isLoading}
            />
            {/* Image-specific file input for mobile camera access */}
             <input
                type="file"
                ref={imageInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
                capture="environment"
                disabled={isLoading}
            />
             <button
                type="button"
                onClick={handleUploadClick}
                disabled={isLoading}
                className="p-2 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label="Upload file or image"
            >
                <PlusIcon className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={isLoading || (!text.trim() && !imageBase64)}
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
    
      {/* Mobile Upload Options Modal */}
      {isUploadOptionsOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-end sm:items-center z-50" 
          onClick={() => setIsUploadOptionsOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <div 
            className="bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md border-t sm:border border-gray-700 transform transition-all p-6"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Upload</h3>
                  <button 
                      onClick={() => setIsUploadOptionsOpen(false)}
                      className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Close"
                  >
                      <CloseIcon className="w-5 h-5" />
                  </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                      onClick={handleTriggerImageInput}
                      className="flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-white transition-colors"
                  >
                      <CameraIcon className="w-8 h-8 mb-2 text-blue-400" />
                      <span className="font-semibold">Take or Upload Photo</span>
                  </button>
                  <button 
                      onClick={handleTriggerFileInput}
                      className="flex flex-col items-center justify-center p-6 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-white transition-colors"
                  >
                      <FileTextIcon className="w-8 h-8 mb-2 text-purple-400" />
                      <span className="font-semibold">Upload File</span>
                  </button>
              </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContentInputForm;