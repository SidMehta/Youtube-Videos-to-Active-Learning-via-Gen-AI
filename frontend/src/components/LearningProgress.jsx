import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';  // <-- Newly added import
import { CheckCircle2, Circle } from 'lucide-react';

const LearningProgress = ({
  currentVideoIndex,
  totalVideos,
  currentSegmentIndex,
  totalSegments,
  learningHistory
}) => {
  // Memoize history calculations to prevent recalculation
  const videoHistories = useMemo(() => {
    const histories = new Array(totalVideos).fill(null).map(() => []);
    learningHistory.forEach(entry => {
      if (entry.videoIndex < totalVideos) {
        histories[entry.videoIndex].push(entry);
      }
    });
    return histories;
  }, [learningHistory, totalVideos]);

  // Memoize accuracy calculations
  const accuracyMetrics = useMemo(() => {
    // Calculate accuracy for each video
    const accuracyByVideo = videoHistories.map(videoHistory => {
      if (videoHistory.length === 0) return 0;
      const correctAnswers = videoHistory.filter(a => a.isCorrect).length;
      return (correctAnswers / videoHistory.length) * 100;
    });

    // Overall accuracy
    const totalAnswers = learningHistory.length;
    const totalCorrect = learningHistory.filter(h => h.isCorrect).length;
    const overallAccuracy =
      totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0;

    return {
      accuracyByVideo,
      overallAccuracy
    };
  }, [learningHistory, videoHistories]);

  // Memoize video progress calculation
  const videoProgress = useMemo(() => {
    if (totalSegments === 0) return 0;
    return (currentSegmentIndex / totalSegments) * 100;
  }, [currentSegmentIndex, totalSegments]);

  // Memoize progress bar renderer
  const renderProgressBar = useCallback(
    index => {
      const isComplete = index < currentVideoIndex;
      const isCurrent = index === currentVideoIndex;
      const progress = isComplete ? 100 : isCurrent ? videoProgress : 0;

      return (
        <div key={index} className="relative">
          {index > 0 && (
            <div
              className="absolute top-0 left-3 -ml-px h-full w-0.5 bg-gray-200"
              aria-hidden="true"
            />
          )}
          <div className="relative flex items-center space-x-4">
            <div className="flex items-center justify-center">
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isComplete
                      ? 'bg-green-500'
                      : isCurrent
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                  }`}
                  style={{
                    width: `${progress}%`
                  }}
                />
              </div>
              <div className="mt-2 flex items-center text-xs">
                <span className="text-gray-600">Video {index + 1}</span>
                {accuracyMetrics.accuracyByVideo[index] > 0 && (
                  <span className="ml-2 text-gray-500">
                    ({Math.round(accuracyMetrics.accuracyByVideo[index])}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    },
    [currentVideoIndex, videoProgress, accuracyMetrics.accuracyByVideo]
  );

  return (
    <div className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto py-4 px-4">
        {/* Overall progress header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-gray-900">Learning Progress</h3>
            <span className="text-sm text-gray-500">
              ({Math.round(accuracyMetrics.overallAccuracy)}% accuracy)
            </span>
          </div>
          <span className="text-sm text-gray-500">
            Video {currentVideoIndex + 1} of {totalVideos}
          </span>
        </div>

        {/* Progress bars */}
        <div className="space-y-8">
          {Array.from({ length: totalVideos }).map((_, index) =>
            renderProgressBar(index)
          )}
        </div>

        {/* Current segment progress */}
        <div className="flex items-center justify-between mt-8 text-sm text-gray-500">
          <span>
            Question {currentSegmentIndex + 1} of {totalSegments}
          </span>
          {currentVideoIndex < totalVideos && (
            <span>
              Current Video Accuracy:{' '}
              {Math.round(accuracyMetrics.accuracyByVideo[currentVideoIndex])}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Add prop types validation
LearningProgress.propTypes = {
  currentVideoIndex: PropTypes.number.isRequired,
  totalVideos: PropTypes.number.isRequired,
  currentSegmentIndex: PropTypes.number.isRequired,
  totalSegments: PropTypes.number.isRequired,
  learningHistory: PropTypes.arrayOf(
    PropTypes.shape({
      videoIndex: PropTypes.number.isRequired,
      isCorrect: PropTypes.bool.isRequired
    })
  ).isRequired
};

// Memoize the entire component to avoid unnecessary re-renders
export default React.memo(LearningProgress, (prevProps, nextProps) => {
  return (
    prevProps.currentVideoIndex === nextProps.currentVideoIndex &&
    prevProps.totalVideos === nextProps.totalVideos &&
    prevProps.currentSegmentIndex === nextProps.currentSegmentIndex &&
    prevProps.totalSegments === nextProps.totalSegments &&
    prevProps.learningHistory === nextProps.learningHistory
  );
});
