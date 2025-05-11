// ProcessingStatus.jsx
import React from 'react';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const ProcessingStatus = ({ videos = [], currentStatus = { currentVideo: 0, error: null } }) => {
  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Analyzing Videos
          </h2>

          <div className="divide-y space-y-6">
            {/* Current Video Being Processed */}
            <div className="flex items-center space-x-4 pb-6">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <div>
                <div className="text-lg font-medium text-gray-900">
                  Video {currentStatus.currentVideo + 1} of {videos.length}
                </div>
                <div className="text-sm text-gray-500">
                  Processing your video...
                </div>
              </div>
            </div>

            {/* Processing Steps */}
            <div className="pt-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                </div>
                <span className="text-gray-700">Loading video</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                </div>
                <span className="text-gray-700">Analyzing content</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                </div>
                <span className="text-gray-700">Creating questions</span>
              </div>
            </div>

            {/* Info Message */}
            <div className="pt-6 text-center">
              <p className="text-sm text-gray-500">This may take a few minutes.</p>
              <p className="text-sm text-gray-500 mt-1">Please don't close this window.</p>
            </div>

            {/* Error Message if needed */}
            {currentStatus.error && (
              <div className="pt-6">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{currentStatus.error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingStatus;