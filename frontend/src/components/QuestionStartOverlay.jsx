import React from 'react';
import { Play } from 'lucide-react';

const QuestionStartOverlay = ({ questionNumber, onStart }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Question {questionNumber}
        </h2>
        
        <p className="text-gray-600 mb-6">
          Tap to hear the question and answer options
        </p>
        
        <button
          onClick={onStart}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Play className="w-5 h-5 mr-2" />
          Start Question {questionNumber}
        </button>
      </div>
    </div>
  );
};

export default QuestionStartOverlay;