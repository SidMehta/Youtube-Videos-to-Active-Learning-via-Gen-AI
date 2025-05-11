// DetailedExplanationModal.jsx
import React from 'react';
import { X } from 'lucide-react';

const DetailedExplanationModal = ({ 
  isOpen, 
  onClose, 
  explanation = {
    english: '',
    translated: ''
  }, 
  language = 'english' 
}) => {
  if (!isOpen) return null;

  const getLanguageDisplay = (lang) => {
    const languages = {
      spanish: 'Spanish',
      hindi: 'Hindi',
      english: 'English'
    };
    return languages[lang] || lang;
  };

  // Always show English content
  const showTranslation = language !== 'english' && explanation.translated && 
                         explanation.translated !== 'Translation not available';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Let's Understand This Better
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            aria-label="Close explanation"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* English Explanation */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              In English:
            </h3>
            <div className="prose max-w-none">
              <p className="text-gray-600 whitespace-pre-wrap">
                {explanation.english || "Detailed explanation not available"}
              </p>
            </div>
          </div>

          {/* Translated Explanation */}
          {showTranslation && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                In {getLanguageDisplay(language)}:
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-600 whitespace-pre-wrap">
                  {explanation.translated}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continue Learning
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailedExplanationModal;