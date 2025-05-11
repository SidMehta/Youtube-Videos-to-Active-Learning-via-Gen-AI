import React, { useState, useEffect, useCallback, useRef } from 'react';
import VideoInput from './components/VideoInput';
import NameInput from './components/NameInput';
import LearningInterface from './components/LearningInterface';
import PerformanceReport from './components/PerformanceReport';
import { useLearningSession } from './hooks/useLearningSession';

const DEBUG = true;

const debugLog = (...args) => {
  if (DEBUG) {
    console.log('[App]', ...args);
  }
};

const AppStates = {
  VIDEO_INPUT: 'video-input',
  NAME_INPUT: 'name-input',
  LEARNING: 'learning-interface',
  REPORT: 'performance-report'
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Restart Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  debugLog('App rendering');
  const [currentPage, setCurrentPage] = useState(AppStates.VIDEO_INPUT);
  const { 
    session, 
    startNewSession, 
    clearSession,
    updateSession 
  } = useLearningSession();
  
  const isMountedRef = useRef(true);
  const isTransitioningRef = useRef(false);
  const previousPageRef = useRef(currentPage);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetCurrentPage = useCallback((newPage) => {
    setCurrentPage((prevPage) => {
      debugLog(`Changing page from ${prevPage} to ${newPage}`);
      previousPageRef.current = prevPage;
      return newPage;
    });
  }, []);

  useEffect(() => {
    const syncSessionState = async () => {
      if (!session || isTransitioningRef.current) {
        debugLog('Skipping session sync - no session or transition in progress');
        return;
      }
      
      debugLog('Syncing session state:', {
        session,
        currentPage,
        isTransitioning: isTransitioningRef.current
      });
  
      try {
        isTransitioningRef.current = true;
        
        const sessionState = {
          hasAnalysis: !!session.analysis && Array.isArray(session.analysis),
          hasUserName: !!session.userName,
          hasVideos: !!session.videos && Array.isArray(session.videos),
          isComplete: !!session.isComplete
        };
        
        debugLog('Session state check:', sessionState);

        if (!sessionState.hasAnalysis || !sessionState.hasVideos) {
          debugLog('Staying/Moving to VIDEO_INPUT - missing analysis or videos');
          safeSetCurrentPage(AppStates.VIDEO_INPUT);
        } else if (!sessionState.hasUserName) {
          debugLog('Moving to NAME_INPUT - missing userName');
          safeSetCurrentPage(AppStates.NAME_INPUT);
        } else if (sessionState.isComplete) {
          debugLog('Moving to REPORT - session complete');
          safeSetCurrentPage(AppStates.REPORT);
        } else if (sessionState.hasVideos && sessionState.hasUserName && sessionState.hasAnalysis) {
          debugLog('Moving to LEARNING - all requirements met');
          safeSetCurrentPage(AppStates.LEARNING);
        }
      } catch (error) {
        console.error('Session sync error:', error);
      } finally {
        isTransitioningRef.current = false;
      }
    };

    syncSessionState();
  }, [session, safeSetCurrentPage, currentPage]);

  // FIX: Include selectedLanguage from VideoInput in the session data.
  const handleVideoAnalysis = useCallback(async (data) => {
    debugLog('Video analysis data received:', data);
    if (isTransitioningRef.current) {
      debugLog('Skipping video analysis - transition in progress');
      return;
    }

    try {
      isTransitioningRef.current = true;
      const sessionData = {
        videos: data.videos,
        analysis: data.results,
        selectedLanguage: data.selectedLanguage  // Added this line
      };
      debugLog('Starting new session with data:', sessionData);
      await startNewSession(sessionData);
      
      if (isMountedRef.current) {
        safeSetCurrentPage(AppStates.NAME_INPUT);
      }
    } catch (error) {
      console.error('Video analysis error:', error);
    } finally {
      isTransitioningRef.current = false;
    }
  }, [startNewSession, safeSetCurrentPage]);

  // FIX: Update session with both userName and selectedLanguage when submitting the name.
  const handleNameSubmit = useCallback(async (data) => {
    debugLog('Name submit data received:', data);
    if (isTransitioningRef.current) {
      debugLog('Skipping name submit - transition in progress');
      return;
    }

    try {
      isTransitioningRef.current = true;
      debugLog('Updating session with userName and selectedLanguage:', data.name, data.selectedLanguage);
      await updateSession({
        userName: data.name,
        selectedLanguage: data.selectedLanguage  // Preserve the language value
      });
      
      if (isMountedRef.current) {
        safeSetCurrentPage(AppStates.LEARNING);
      }
    } catch (error) {
      console.error('Name submit error:', error);
    } finally {
      isTransitioningRef.current = false;
    }
  }, [updateSession, safeSetCurrentPage]);

  const handleLearningComplete = useCallback(async (learningHistory) => {
    debugLog('Learning complete - history received:', learningHistory);
    if (isTransitioningRef.current) {
      debugLog('Skipping learning complete - transition in progress');
      return;
    }

    try {
      isTransitioningRef.current = true;
      await updateSession({
        isComplete: true,
        endTime: new Date().toISOString(),
        finalHistory: learningHistory
      });
      
      if (isMountedRef.current) {
        safeSetCurrentPage(AppStates.REPORT);
      }
    } catch (error) {
      console.error('Learning complete error:', error);
    } finally {
      isTransitioningRef.current = false;
    }
  }, [updateSession, safeSetCurrentPage]);

  const handleRestart = useCallback(async () => {
    debugLog('Restarting session');
    if (isTransitioningRef.current) {
      debugLog('Skipping restart - transition in progress');
      return;
    }

    try {
      isTransitioningRef.current = true;
      await clearSession();
      
      if (isMountedRef.current) {
        safeSetCurrentPage(AppStates.VIDEO_INPUT);
      }
    } catch (error) {
      console.error('Restart error:', error);
    } finally {
      isTransitioningRef.current = false;
    }
  }, [clearSession, safeSetCurrentPage]);

  const handleBack = useCallback(async () => {
    debugLog('Back button pressed - current page:', currentPage);
    if (isTransitioningRef.current) {
      debugLog('Skipping back - transition in progress');
      return;
    }

    try {
      isTransitioningRef.current = true;
      
      switch (currentPage) {
        case AppStates.NAME_INPUT:
          debugLog('Going back from NAME_INPUT to VIDEO_INPUT');
          await clearSession();
          if (isMountedRef.current) {
            safeSetCurrentPage(AppStates.VIDEO_INPUT);
          }
          break;
        case AppStates.LEARNING:
          if (!session?.progress?.history?.length) {
            debugLog('Going back from LEARNING to NAME_INPUT - no progress');
            if (isMountedRef.current) {
              safeSetCurrentPage(AppStates.NAME_INPUT);
            }
          } else {
            debugLog('Staying on LEARNING - progress exists');
          }
          break;
        default:
          debugLog('No back action for current page:', currentPage);
          break;
      }
    } catch (error) {
      console.error('Back navigation error:', error);
    } finally {
      isTransitioningRef.current = false;
    }
  }, [currentPage, session, clearSession, safeSetCurrentPage]);

  debugLog('Rendering page:', currentPage, 'Session:', session);

  return (
    <ErrorBoundary>
      <div className="app min-h-screen bg-gray-50">
        {currentPage === AppStates.VIDEO_INPUT && (
          <VideoInput onComplete={handleVideoAnalysis} />
        )}
        {currentPage === AppStates.NAME_INPUT && (
          <NameInput 
            onComplete={handleNameSubmit}
            onBack={handleBack}
            selectedLanguage={session.selectedLanguage}  // Pass the language to NameInput
          />
        )}
        {currentPage === AppStates.LEARNING && session && (
          <LearningInterface
            key={`learning-${session.id}`}
            videoData={session.videos}
            analysis={session.analysis}
            userData={{ 
              name: session.userName,
              selectedLanguage: session.selectedLanguage
            }}
            onComplete={handleLearningComplete}
            onBack={handleBack}
          />
        )}
        {currentPage === AppStates.REPORT && session && (
          <PerformanceReport
            learningHistory={session.finalHistory}
            userName={session.userName}
            onRestart={handleRestart}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
