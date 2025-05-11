import React, { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import { ArrowLeft } from 'lucide-react';

const LearningInterface = ({ videoData, userData, onBack }) => {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [error, setError] = useState(null);
  const [answersDisabled, setAnswersDisabled] = useState(false);
  const [characterState, setCharacterState] = useState('idle');
  const playerRef = useRef(null);

  const segments = videoData?.analysis?.segments || [];

  const extractVideoId = (url) => {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : '';
  };

  const convertTimestampToSeconds = (timestamp) => {
    try {
      const [minutes, seconds] = timestamp.split(':').map(Number);
      if (isNaN(minutes) || isNaN(seconds)) {
        throw new Error('Invalid timestamp format');
      }
      return minutes * 60 + seconds;
    } catch (err) {
      console.error('Timestamp conversion error:', err);
      setError(`Invalid timestamp format: ${timestamp}`);
      return 0;
    }
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    console.log('Player ready');
  };

  const onPlayerStateChange = (event) => {
    // YouTube Player States: 
    // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    console.log('Player state changed:', event.data);
    
    if (event.data === 1) { // Playing
      setIsBuffering(false);
      // Add time update checker
      if (playerRef.current) {
        playerRef.current.timeUpdateInterval = setInterval(() => {
          const currentTime = playerRef.current.getCurrentTime();
          const currentSegment = segments[currentSegmentIndex];
          
          if (!currentSegment || showQuestion) return;

          const segmentTime = convertTimestampToSeconds(currentSegment.timestamp);
          console.log(`Time: ${currentTime}, Target: ${segmentTime}, Segment: ${currentSegmentIndex}`);

          if (currentTime >= segmentTime) {
            clearInterval(playerRef.current.timeUpdateInterval);
            playerRef.current.pauseVideo();
            setShowQuestion(true);
            setCharacterState('talking');
          }
        }, 100);
      }
    } else if (event.data === 0) { // Ended
      handleVideoEnd();
    } else if (event.data === 3) { // Buffering
      handleBuffering();
    }

    // Clear interval if video is not playing
    if (event.data !== 1 && playerRef.current?.timeUpdateInterval) {
      clearInterval(playerRef.current.timeUpdateInterval);
    }
  };

  const handleBuffering = () => {
    setIsBuffering(true);
  };

  const handleVideoEnd = () => {
    setVideoEnded(true);
    if (currentSegmentIndex < segments.length - 1) {
      setCharacterState('talking');
    } else {
      setCharacterState('idle');
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    if (answersDisabled) return;
    
    setAnswersDisabled(true);
    setSelectedAnswer(answerIndex);
    
    const isCorrect = answerIndex === segments[currentSegmentIndex].correct_index;
    setCharacterState(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
      setTimeout(() => {
        setShowQuestion(false);
        setSelectedAnswer(null);
        setCharacterState('idle');

        const nextSegmentIndex = currentSegmentIndex + 1;
        if (nextSegmentIndex < segments.length) {
          setCurrentSegmentIndex(nextSegmentIndex);
          if (playerRef.current && !videoEnded) {
            playerRef.current.playVideo();
          }
        }
        
        setAnswersDisabled(false);
      }, 2000);
    } else {
      setTimeout(() => {
        setAnswersDisabled(false);
      }, 2000);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current?.timeUpdateInterval) {
        clearInterval(playerRef.current.timeUpdateInterval);
      }
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-100">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white shadow-sm flex justify-between items-center">
          <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-2xl font-bold">Hi {userData.name}!</h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left side - Video */}
          <div className="w-2/3 h-full flex flex-col">
            <div className="flex-1 relative">
              <YouTube
                videoId={extractVideoId(videoData.url)}
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: {
                    autoplay: 1,
                    modestbranding: 1,
                    rel: 0
                  },
                }}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
                className="absolute inset-0"
              />
            </div>
          </div>

          {/* Right side - Character */}
          <div className="w-1/3 bg-gray-50 p-4 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              {/* Character placeholder */}
              <div className="bg-gray-200 w-48 h-48 rounded-full flex items-center justify-center">
                <span className="text-gray-600">Character</span>
              </div>
            </div>
            {showQuestion && (
              <div className="mt-4">
                <p className="text-lg font-medium mb-2">
                  {segments[currentSegmentIndex].question}
                </p>
                {selectedAnswer !== null && (
                  <p className="mt-2 p-2 rounded bg-gray-100">
                    {selectedAnswer === segments[currentSegmentIndex].correct_index
                      ? segments[currentSegmentIndex].praise
                      : segments[currentSegmentIndex].hint}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom - Progress and Questions */}
        <div className="bg-white border-t">
          {/* Progress bar */}
          <div className="px-4 py-2 border-b">
            <div className="flex items-center gap-2">
              {segments.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded ${
                    index < currentSegmentIndex
                      ? 'bg-green-500'
                      : index === currentSegmentIndex
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-center mt-1">
              Question {currentSegmentIndex + 1} of {segments.length}
            </p>
          </div>

          {/* Question area */}
          {showQuestion && (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {segments[currentSegmentIndex].answers.map((answer, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={answersDisabled}
                    className={`p-4 text-left rounded-lg border-2 transition-all ${
                      selectedAnswer === null
                        ? 'border-gray-200 hover:border-blue-500'
                        : selectedAnswer === index
                        ? index === segments[currentSegmentIndex].correct_index
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : 'border-gray-200'
                    }`}
                  >
                    {answer}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buffering indicator */}
      {isBuffering && (
        <div className="fixed top-4 right-4 bg-yellow-100 p-4 rounded-lg shadow">
          <p className="text-yellow-800">Loading video...</p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-lg">
            <h3 className="text-xl font-bold mb-4">Error</h3>
            <p className="mb-4">{error}</p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningInterface;