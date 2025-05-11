import React, { useEffect } from 'react';
import { Play, Medal } from 'lucide-react';

const VideoTransition = ({ 
  currentVideo, 
  totalVideos, 
  userName, 
  onContinue,
  isLastVideo = false 
}) => {
  // Auto advance after 5 seconds
  useEffect(() => {
    const autoAdvanceTimer = setTimeout(() => {
      onContinue();
    }, 5000);

    return () => clearTimeout(autoAdvanceTimer);
  }, [onContinue]);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg max-w-lg w-full mx-4 text-center">
        {isLastVideo ? (
          <>
            <div className="flex justify-center mb-4">
              <Medal className="h-16 w-16 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">
              Amazing Work, {userName}!
            </h2>
            <p className="text-gray-600 mb-6">
              You've completed the video! You are Amazing!
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">
              Great job with video {currentVideo + 1}, {userName}!
            </h2>
            <p className="text-gray-600 mb-6">
              Ready for video {currentVideo + 2} of {totalVideos}?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={onContinue}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="w-5 h-5 mr-2" />
                Continue Learning
              </button>
            </div>
          </>
        )}
        
        <div className="mt-6">
          <div className="flex justify-center space-x-2">
            {Array.from({ length: totalVideos }).map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full ${
                  index <= currentVideo
                    ? 'bg-blue-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Continuing automatically in a few seconds...
        </p>
      </div>
    </div>
  );
};

export default VideoTransition;