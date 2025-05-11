import React, {
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState
} from 'react';
import YouTube from 'react-youtube';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import CharacterAnimation from './CharacterAnimation';
import LearningProgress from './LearningProgress';
import VideoTransition from './VideoTransition';
import DetailedExplanationModal from './DetailedExplanationModal';
import {
  learningQueueReducer,
  QueueActionTypes,
  initialQueueState
} from './learningQueueState';
import {
  convertTimestampToSeconds,
  extractVideoId
} from './utils';
import { speakText, audioQueue } from '../services/textToSpeech';

// New imports for iOS audio overlay support
import { isIOS } from '../utils/iOSDetection';
import { isAudioInitialized } from '../utils/audioContext';
import AudioEnableOverlay from './AudioEnableOverlay';
import QuestionStartOverlay from './QuestionStartOverlay';

const DEBUG = true;
const debugLog = (...args) => {
  if (DEBUG) {
    console.log('[LearningInterface]', ...args);
  }
};

const LearningInterface = ({ videoData, analysis, userData, onComplete, onBack }) => {
  debugLog('Component mounting with props:', { videoData, analysis, userData });

  const [state, dispatch] = useReducer(learningQueueReducer, {
    ...initialQueueState,
    totalVideos: videoData.length
  });
  const [showDetailedExplanation, setShowDetailedExplanation] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // New state for audio overlay
  const [showAudioOverlay, setShowAudioOverlay] = useState(false);
  const [showQuestionOverlay, setShowQuestionOverlay] = useState(false);

  // Responsive breakpoints
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isPortrait = useMediaQuery({ orientation: 'portrait' });
  const isLandscape = useMediaQuery({ orientation: 'landscape' });

  // Refs for managing resources and flags.
  const playerRef = useRef(null);
  const audioRef = useRef(null);
  const isMountedRef = useRef(true);
  const isProcessingAnswerRef = useRef(false);
  const timeoutRefs = useRef([]);
  const lastCheckTimeRef = useRef(0);
  const intervalRef = useRef(null);
  // For cancellation of pending audio sequences.
  const currentSequenceRef = useRef(0);

  // Memoize current data.
  const currentVideo = useMemo(
    () => videoData[state.currentVideoIndex],
    [videoData, state.currentVideoIndex]
  );
  const currentAnalysis = useMemo(
    () => analysis[state.currentVideoIndex],
    [analysis, state.currentVideoIndex]
  );

  // Compute the correct answers count from the learning history.
  const correctAnswersCount = state.learningHistory.filter(
    (entry) => entry.isCorrect
  ).length;

  useEffect(() => {
    debugLog('State updated:', state);
  }, [state]);

  useEffect(() => {
    dispatch({
      type: QueueActionTypes.UPDATE_PROGRESS,
      payload: { currentSegmentIndex: 0, selectedAnswer: null, questionAnswered: false }
    });
  }, [videoData, state.currentVideoIndex]);

  // New useEffect: Only show the overlay on iOS if audio isn't already initialized
  useEffect(() => {
    if (isIOS() && !isAudioInitialized()) {
      setShowAudioOverlay(true);
    }
  }, []);

  // New handler function for when audio is enabled.
  const handleAudioEnabled = () => {
    setShowAudioOverlay(false);
  };

  const cleanupAudio = useCallback(async () => {
    debugLog('Cleaning up audio');
    try {
      if (audioRef.current) {
        await audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
        audioRef.current = null;
      }
    } catch (error) {
      console.error('Audio cleanup error:', error);
    }
  }, []);

  const handleAudioUpdate = useCallback((isPlaying) => {
    debugLog('Audio state update:', isPlaying);
    dispatch({
      type: QueueActionTypes.UPDATE_PROGRESS,
      payload: {
        audioState: isPlaying ? 'playing' : 'idle',
        characterState: isPlaying ? 'speaking' : 'idle',
        showCharacter: true
      }
    });
  }, []);

  const playAudio = useCallback(
    async (text) => {
      debugLog('Playing audio:', text);
      await cleanupAudio();
      try {
        handleAudioUpdate(true);
        // IMPORTANT: Ensure speakText returns a promise that resolves after playback.
        // If not, our artificial delay in the answer handler will help.
        await speakText(text.replace(/{name}/g, userData.name));
        if (isMountedRef.current) {
          handleAudioUpdate(false);
          dispatch({ type: QueueActionTypes.ENABLE_ANSWERS });
        }
      } catch (error) {
        console.error('Speech error:', error);
        handleAudioUpdate(false);
      }
    },
    [cleanupAudio, handleAudioUpdate, userData.name]
  );

  // Helper function to trigger full question display (pausing video, showing UI, and running audio sequence).
  const triggerQuestionDisplay = useCallback(async (segment, newIndex) => {
    const sequenceId = ++currentSequenceRef.current;
    try {
      await playerRef.current.pauseVideo();
    } catch (error) {
      console.error('Error pausing video:', error);
    }

  // For iOS, show the overlay instead of starting audio sequence
  if (isIOS()) {
    dispatch({
      type: QueueActionTypes.UPDATE_PROGRESS,
      payload: {
        currentSegmentIndex: newIndex,
        showQuestion: false, // Don't show question yet
        showCharacter: false,
        isBuffering: false,
        selectedAnswer: null,
        questionAnswered: false
      }
    });
    setShowQuestionOverlay(true);
    return;
  }

    dispatch({
      type: QueueActionTypes.UPDATE_PROGRESS,
      payload: {
        currentSegmentIndex: newIndex,
        showQuestion: true,
        showCharacter: true,
        isBuffering: false,
        selectedAnswer: null,
        questionAnswered: false
      }
    });
    try {
      // const introText = `Hey ${userData.name}! I have a question for you!`;
      if (!isMountedRef.current || currentSequenceRef.current !== sequenceId) return;
      const introText = ``;
      debugLog('Playing intro:', introText);
      if (currentSequenceRef.current !== sequenceId) return;
      await playAudio(introText);
      // if (!isMountedRef.current || currentSequenceRef.current !== sequenceId) return;
      debugLog('Playing question:', segment.question);
      await playAudio(segment.question);
      // if (!isMountedRef.current || currentSequenceRef.current !== sequenceId) return;
      const answerText = segment.answers
        .map((answer, index) => `Option ${index + 1}: ${answer}`)
        .join('. ');
      debugLog('Playing answer options:', answerText);
      await playAudio(answerText);
    } catch (error) {
      console.error('Question audio sequence error:', error);
    }
  }, [playAudio, userData.name]);

  // Check the video time every 100 ms.
  const checkQuestionTiming = useCallback(async () => {
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 100) return;
    lastCheckTimeRef.current = now;
    if (!playerRef.current || !isMountedRef.current) {
      debugLog('Check skipped: player not ready or component unmounted');
      return;
    }
    try {
      const currentTime = await playerRef.current.getCurrentTime();
      // If the current question has been answered, wait for the next question's timestamp.
      if (state.questionAnswered) {
        const nextSegmentIndex = state.currentSegmentIndex + 1;
        if (nextSegmentIndex < currentAnalysis.segments.length) {
          const nextSegment = currentAnalysis.segments[nextSegmentIndex];
          const nextSegmentTime = convertTimestampToSeconds(nextSegment.timestamp);
          debugLog('Waiting for next segment:', { currentTime, nextSegmentTime });
          if (currentTime >= nextSegmentTime) {
            if (!state.showQuestion) {
              await triggerQuestionDisplay(nextSegment, nextSegmentIndex);
              return;
            }
          }
        }
        return;
      }
      // Otherwise, if no question is showing, check if it's time for the current question.
      const currentSegment = currentAnalysis.segments[state.currentSegmentIndex];
      debugLog('Timing check:', {
        currentTime,
        segmentIndex: state.currentSegmentIndex,
        currentSegment,
        showQuestion: state.showQuestion
      });
      if (!currentSegment || state.showQuestion) {
        debugLog('Check skipped: no segment or question already showing');
        return;
      }
      const segmentTime = convertTimestampToSeconds(currentSegment.timestamp);
      debugLog('Time comparison:', { currentTime, segmentTime });
      if (currentTime >= segmentTime) {
        debugLog('Triggering question display');
        try {
          await playerRef.current.pauseVideo();
        } catch (error) {
          console.error('Error pausing video:', error);
        }
        if (!isMountedRef.current) return;
        await triggerQuestionDisplay(currentSegment, state.currentSegmentIndex);
      }
    } catch (error) {
      console.error('Timing check error:', error);
    }
  }, [
    state.currentSegmentIndex,
    state.questionAnswered,
    state.showQuestion,
    currentAnalysis,
    userData.name,
    playAudio,
    triggerQuestionDisplay
  ]);

  const handleVideoEnd = useCallback(async () => {
    debugLog('Video ended');
    if (state.currentVideoIndex >= videoData.length - 1) {
      debugLog('Final video completed');
      await playAudio(`Congratulations ${userData.name}! You've completed all the videos!`);
      onComplete(state.learningHistory);
      return;
    }
    dispatch({ type: QueueActionTypes.NEXT_VIDEO });
    if (playerRef.current) {
      playerRef.current.stopVideo();
    }
  }, [
    state.currentVideoIndex,
    videoData.length,
    userData.name,
    onComplete,
    state.learningHistory,
    playAudio
  ]);



// Add new handler for question start
const handleQuestionStart = useCallback(async () => {
  const currentSegment = currentAnalysis.segments[state.currentSegmentIndex];
  setShowQuestionOverlay(false);
  
  dispatch({
    type: QueueActionTypes.UPDATE_PROGRESS,
    payload: {
      showQuestion: true,
      showCharacter: true
    }
  });

  try {
    const introText = ``;
    await playAudio(introText);
    await playAudio(currentSegment.question);
    const answerText = currentSegment.answers
      .map((answer, index) => `Option ${index + 1}: ${answer}`)
      .join('. ');
    await playAudio(answerText);
  } catch (error) {
    console.error('Question audio sequence error:', error);
  }
}, [currentAnalysis, state.currentSegmentIndex, playAudio]);



  const handleVideoStateChange = useCallback(
    (event) => {
      if (!isMountedRef.current) return;
      debugLog('Video state changed:', event.data);
      try {
        switch (event.data) {
          case YouTube.PlayerState.PLAYING:
            debugLog('Video playing - setting up interval');
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
              checkQuestionTiming().catch(error => {
                console.error('Question timing check failed:', error);
              });
            }, 100);
            dispatch({
              type: QueueActionTypes.UPDATE_PROGRESS,
              payload: { showCharacter: false, isBuffering: false }
            });
            break;
          case YouTube.PlayerState.ENDED:
            debugLog('Video ended');
            if (intervalRef.current) clearInterval(intervalRef.current);
            handleVideoEnd();
            break;
          case YouTube.PlayerState.BUFFERING:
            debugLog('Video buffering');
            dispatch({
              type: QueueActionTypes.UPDATE_PROGRESS,
              payload: { isBuffering: true }
            });
            break;
          case YouTube.PlayerState.PAUSED:
            debugLog('Video paused');
            if (intervalRef.current) clearInterval(intervalRef.current);
            break;
        }
      } catch (error) {
        console.error('Video state change error:', error);
      }
    },
    [checkQuestionTiming, handleVideoEnd]
  );

  const finishAnswerFlow = useCallback(() => {
    if (!isMountedRef.current) return;
    
    dispatch({
      type: QueueActionTypes.UPDATE_PROGRESS,
      payload: {
        showQuestion: false,
        showCharacter: false,
        questionAnswered: true
      }
    });

    if (playerRef.current && !state.videoEnded) {
      playerRef.current.playVideo();
    }
  }, [state.videoEnded]);

  // When an answer is clicked, record the selection (for UI highlighting),
  // cancel any pending question audio sequence, record the answer in learning history,
  // play the feedback audio, and then mark the question as answered.
  // We leave selectedAnswer intact for UI highlighting until the next question is triggered.
  const handleAnswerSelect = useCallback(
    async (answerIndex) => {
      if (!state.isAnswerSelectionEnabled || isProcessingAnswerRef.current) return;
      try {
        isProcessingAnswerRef.current = true;
        // Cancel any pending audio sequence.
        currentSequenceRef.current++;
        await cleanupAudio();

        await audioQueue.clear();
        
        // Record the selected answer for UI highlighting.
        dispatch({
          type: QueueActionTypes.UPDATE_PROGRESS,
          payload: { selectedAnswer: answerIndex, showCharacter: true }
        });
        
        const currentSegment = currentAnalysis.segments[state.currentSegmentIndex];
        const isCorrect = answerIndex === currentSegment.correct_index;
        
        // Record the answer in learning history.
        dispatch({
          type: QueueActionTypes.RECORD_ANSWER,
          payload: {
            answer: answerIndex,
            isCorrect,
            questionData: {
              question: currentSegment.question,
              correctAnswer: currentSegment.answers[currentSegment.correct_index],
              userAnswer: currentSegment.answers[answerIndex],
              timestamp: new Date().toISOString()
            }
          }
        });

        if (!isCorrect) {
          // For wrong answers:
          // 1. First play the explanation audio
          const feedbackText = currentSegment.explanation;
          await playAudio(feedbackText);
          
          // 2. Only after audio finishes, show the detailed explanation modal
          if (isMountedRef.current) {
            setShowDetailedExplanation(true);
          await cleanupAudio();
          await audioQueue.clear();
          }
          return; // Wait for modal close to continue
        } else {
          // For correct answers:
          // Play praise audio
          const praiseText = currentSegment.praise;
          await playAudio(praiseText);
          // Add delay after audio
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (!isMountedRef.current) return;
          finishAnswerFlow();
        }
      } catch (error) {
        console.error('Answer selection error:', error);
      } finally {
        isProcessingAnswerRef.current = false;
      }
    },
    [
      state.isAnswerSelectionEnabled,
      state.currentSegmentIndex,
      state.videoEnded,
      currentAnalysis,
      playAudio,
      cleanupAudio,
      finishAnswerFlow
    ]
  );

  // Cleanup effect.
  useEffect(() => {
    debugLog('Setting up cleanup');
    return () => {
      debugLog('Component cleanup');
      isMountedRef.current = false;
      isProcessingAnswerRef.current = false;
      cleanupAudio();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.error('Player cleanup error:', error);
        }
        playerRef.current = null;
      }
    };
  }, [cleanupAudio]);

  // YouTube player options based on device orientation
  const getYouTubeOpts = () => {
    // Base options that apply to all scenarios
    const baseOpts = {
      playerVars: {
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
        controls: 1
      }
    };
    
    // For mobile in portrait, set specific dimensions
    if (isMobile && isPortrait) {
      return {
        ...baseOpts,
        width: '100%',
        height: '100%'
      };
    }
    
    // Default for landscape and desktop
    return {
      ...baseOpts,
      width: '100%',
      height: '100%'
    };
  };

  // Toggle sidebar for mobile view
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`min-h-screen w-full bg-gray-50 ${isMobile ? 'mobile' : ''}`}>
      {/* Audio Enable Overlay - Only shows on iOS */}
      {showAudioOverlay && (
        <AudioEnableOverlay onAudioEnabled={handleAudioEnabled} />
      )}

      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-full shadow-md"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          {sidebarOpen ? (
            <X className="w-6 h-6 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 text-gray-700" />
          )}
        </button>
      )}

      {/* Left Sidebar - Desktop Fixed, Mobile Slide-in */}
      <div 
        className={`${isMobile ? 
          `fixed left-0 top-0 h-full bg-white shadow-lg p-4 overflow-y-auto z-40 transition-transform duration-300 transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isPortrait ? 'w-3/4' : 'w-60'}`
          : 
          'fixed left-0 top-0 h-full w-60 bg-white shadow-lg p-4 overflow-y-auto'
        }`}
      >
        <div className="mb-6">
          <h2 className="text-xl font-bold">Score</h2>
          <p className="text-sm text-gray-600">
            Correct Answers: {correctAnswersCount}
          </p>
        </div>
        <div className="space-y-6">
          {videoData.map((video, videoIndex) => {
            const isCurrentVideo = videoIndex === state.currentVideoIndex;
            const videoCompleted = videoIndex < state.currentVideoIndex;
            return (
              <div
                key={videoIndex}
                className={`space-y-2 ${
                  videoCompleted
                    ? 'text-green-600'
                    : isCurrentVideo
                    ? 'text-blue-600'
                    : 'text-gray-600'
                }`}
              >
                <h3 className="font-medium">Video {videoIndex + 1}</h3>
                {currentAnalysis.segments.map((_, questionIndex) => {
                  const questionCompleted =
                    videoCompleted ||
                    (isCurrentVideo && questionIndex < state.currentSegmentIndex);
                  const isCurrentQuestion =
                    isCurrentVideo && questionIndex === state.currentSegmentIndex;
                  const questionAnswer = state.learningHistory.find(
                    (h) => h.videoIndex === videoIndex && h.segmentIndex === questionIndex
                  );
                  return (
                    <div
                      key={questionIndex}
                      className={`text-sm pl-4 flex items-center space-x-2 ${
                        questionCompleted
                          ? 'text-green-600'
                          : isCurrentQuestion
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}
                    >
                      <span>→</span>
                      <span>Question {questionIndex + 1}</span>
                      {questionAnswer && (
                        <span
                          className={`ml-2 text-xs ${
                            questionAnswer.isCorrect
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          ({questionAnswer.isCorrect ? '✓' : '×'})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <div 
        className={`${isMobile ? 'p-2 pt-14' : 'ml-60 p-6'}`}
      >
        {/* Top Bar - Name */}
        <div className={`flex justify-end mb-2 ${isMobile ? 'mr-2' : 'mb-6'}`}>
          <span className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
            {userData.name}
          </span>
        </div>

        {/* Main Content Layout */}
        <div className="space-y-4">
          {/* Video and Character Layout */}
          {isMobile && isPortrait ? (
            // Mobile Portrait: Stacked layout
            <div className="space-y-3">
              {/* Video Container */}
              <div className="w-full">
                <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden">
                  <YouTube
                    videoId={extractVideoId(currentVideo.url)}
                    opts={getYouTubeOpts()}
                    onReady={(event) => {
                      debugLog('YouTube player ready');
                      playerRef.current = event.target;
                    }}
                    onStateChange={handleVideoStateChange}
                    onError={(error) => {
                      console.error('YouTube player error:', error);
                    }}
                    className="absolute inset-0"
                  />
                </div>
              </div>
              
              {/* Character and Question (if shown) */}
              {state.showQuestion && (
                <div className="w-full space-y-3">
                  <div className="bg-white rounded-lg p-3 shadow-md">
                    <CharacterAnimation
                      state={state.characterState}
                      visible={state.showCharacter}
                      isPlaying={state.audioState === 'playing'}
                    />
                  </div>
                  {/* FIXED: Ensure question is clearly visible with high contrast */}
                  <div className="bg-white rounded-lg p-3 shadow-md">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {currentAnalysis.segments[state.currentSegmentIndex]?.question}
                    </h2>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Desktop or Mobile Landscape: Side-by-side layout
            <div className={`flex ${isMobile ? 'gap-2' : 'gap-6'}`}>
              {/* Video Player */}
              <div
                className={`transition-all duration-300 ease-in-out ${
                  state.showQuestion ? (isMobile ? 'w-1/2' : 'w-2/3') : 'w-full'
                }`}
              >
                <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden">
                  <YouTube
                    videoId={extractVideoId(currentVideo.url)}
                    opts={getYouTubeOpts()}
                    onReady={(event) => {
                      debugLog('YouTube player ready');
                      playerRef.current = event.target;
                    }}
                    onStateChange={handleVideoStateChange}
                    onError={(error) => {
                      console.error('YouTube player error:', error);
                    }}
                    className="absolute inset-0"
                  />
                </div>
              </div>
              
              {/* Avatar and Question Area */}
              {state.showQuestion && (
                <div className={`${isMobile ? 'w-1/2 space-y-2' : 'w-1/3 space-y-4'}`}>
                  <div className={`bg-white rounded-lg ${isMobile ? 'p-2' : 'p-4'} shadow-lg`}>
                    <CharacterAnimation
                      state={state.characterState}
                      visible={state.showCharacter}
                      isPlaying={state.audioState === 'playing'}
                    />
                  </div>
                  {/* FIXED: Ensure question is clearly visible with high contrast */}
                  <div className={`bg-white rounded-lg ${isMobile ? 'p-2' : 'p-4'} shadow-lg`}>
                    <h2 className={`${isMobile ? 'text-base' : 'text-xl'} font-semibold text-gray-900`}>
                      {currentAnalysis.segments[state.currentSegmentIndex]?.question}
                    </h2>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Explanation Box */}
          {state.showQuestion && state.selectedAnswer !== null && (
            <div className={`bg-white rounded-lg ${isMobile ? 'p-3 text-sm' : 'p-4'} shadow-lg`}>
              <h3 className="font-semibold mb-2">Explanation</h3>
              <p className="text-gray-700">
                {currentAnalysis.segments[state.currentSegmentIndex]?.explanation}
              </p>
            </div>
          )}
          
          {/* Answer Options Grid */}
          {state.showQuestion && (
            <div className={`grid ${isMobile && isPortrait ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              {currentAnalysis.segments[state.currentSegmentIndex]?.answers.map(
                (answer, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={!state.isAnswerSelectionEnabled}
                    className={`${isMobile ? 'p-3 text-sm' : 'p-6'} text-left rounded-lg border-2 transition-all ${getAnswerButtonClasses(
                      state,
                      index,
                      currentAnalysis.segments[state.currentSegmentIndex]
                    )}`}
                    // FIXED: Ensure answer text is always visible
                    style={{ color: 'inherit', minHeight: isMobile ? '44px' : '64px' }}
                  >
                    {answer}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Back Button - Positioned differently on mobile */}
      <button
        onClick={onBack}
        className={`${
          isMobile 
            ? 'fixed top-4 right-4 px-2 py-1 text-sm'
            : 'fixed top-4 left-64 px-3 py-2'
        } flex items-center text-gray-600 hover:text-gray-900 bg-white rounded-lg shadow z-10`}
      >
        <ArrowLeft className={`${isMobile ? 'w-4 h-4 mr-1' : 'w-5 h-5 mr-2'}`} />
        Back
      </button>

      {/* Video Transition Overlay */}
      {state.showVideoTransition && (
        <VideoTransition
          currentVideo={state.currentVideoIndex}
          totalVideos={videoData.length}
          userName={userData.name}
          onContinue={() => {
            debugLog('Video transition continue clicked');
            dispatch({
              type: QueueActionTypes.UPDATE_PROGRESS,
              payload: { showVideoTransition: false }
            });
            if (playerRef.current) {
              playerRef.current.playVideo();
            }
          }}
          isLastVideo={state.currentVideoIndex === videoData.length - 1}
        />
      )}

      {/* Loading Indicator */}
      {state.isBuffering && (
        <div className={`fixed ${isMobile ? 'top-14 right-2' : 'top-4 right-4'} bg-white rounded-lg shadow p-2 z-20`}>
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Loading video...</span>
          </div>
        </div>
      )}

    {showQuestionOverlay && isIOS() && (
      <QuestionStartOverlay
        questionNumber={state.currentSegmentIndex + 1}
        onStart={handleQuestionStart}
      />
    )}
      {/* Detailed Explanation Modal - Adjusted for mobile */}
      <DetailedExplanationModal
        isOpen={showDetailedExplanation}
        onClose={() => {
          setShowDetailedExplanation(false);
          finishAnswerFlow();
        }}
        explanation={currentAnalysis?.segments[state.currentSegmentIndex]?.detailed_explanation}
        language={userData.selectedLanguage}
        isMobile={isMobile}
      />
    </div>
  );
};

// 2. Fix for answer selection visibility issues
// Modified getAnswerButtonClasses function to ensure text visibility
const getAnswerButtonClasses = (state, index, currentSegment) => {
  const baseClasses = 'transition-all duration-200 text-gray-800';
  if (!state.isAnswerSelectionEnabled) {
    return `${baseClasses} opacity-50 cursor-not-allowed border-gray-200`;
  }
  if (state.selectedAnswer === null) {
    return `${baseClasses} border-gray-200 hover:border-blue-500 hover:bg-blue-50`;
  }
  if (state.selectedAnswer === index) {
    if (index === currentSegment.correct_index) {
      return `${baseClasses} border-green-500 bg-green-50 text-gray-900 font-medium`;
    }
    return `${baseClasses} border-red-500 bg-red-50 text-gray-900 font-medium`;
  }
  if (state.selectedAnswer !== null && index === currentSegment.correct_index) {
    return `${baseClasses} border-green-500 bg-green-50 text-gray-900 font-medium`;
  }
  return `${baseClasses} border-gray-200`;
};

export default LearningInterface;
