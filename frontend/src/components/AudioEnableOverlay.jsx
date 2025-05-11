import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { initAudioForIOS } from '../utils/audioContext';

const AudioEnableOverlay = ({ onAudioEnabled }) => {
  const [isEnabling, setIsEnabling] = useState(false);
  
  const handleEnableAudio = async () => {
    setIsEnabling(true);
    try {
      const success = await initAudioForIOS();
      if (success) {
        onAudioEnabled();
      } else {
        // If failed, allow retry
        setIsEnabling(false);
      }
    } catch (error) {
      console.error('Error enabling audio:', error);
      setIsEnabling(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md text-center">
        <Volume2 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Enable Audio
        </h2>
        
        <p className="text-gray-600 mb-6">
          To hear questions and feedback, please tap the button below to enable audio.
          This is required for the learning experience to work properly on iOS devices.
        </p>
        
        <button
          onClick={handleEnableAudio}
          disabled={isEnabling}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
        >
          {isEnabling ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Enabling Audio...
            </>
          ) : (
            <>
              Tap to Enable Audio
            </>
          )}
        </button>
        
        <p className="mt-4 text-sm text-gray-500">
          You'll only need to do this once per session.
        </p>
      </div>
    </div>
  );
};

export default AudioEnableOverlay;