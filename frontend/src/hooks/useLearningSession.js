// hooks/useLearningSession.js
import { useState, useCallback, useEffect } from 'react';

const SESSION_STORAGE_KEY = 'learningSession';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

const initialSessionState = {
  id: null,
  startTime: null,
  endTime: null,
  userName: '',
  selectedLanguage: 'english',  // Added language
  videos: null,
  analysis: null,
  progress: {
    currentVideoIndex: 0,
    currentSegmentIndex: 0,
    history: []
  },
  isComplete: false,
  finalHistory: null
};

export const useLearningSession = () => {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  // Load session from storage on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
          const parsedSession = JSON.parse(savedSession);
          
          // Check session timeout
          const now = Date.now();
          const sessionAge = now - new Date(parsedSession.startTime).getTime();
          
          if (sessionAge < SESSION_TIMEOUT && !parsedSession.isComplete) {
            // Ensure language exists in loaded session
            if (!parsedSession.selectedLanguage) {
              parsedSession.selectedLanguage = 'english';
            }
            setSession(parsedSession);
          } else {
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
        setError('Failed to load previous session');
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    };

    loadSession();
  }, []);

  // Save session to storage whenever it changes
  useEffect(() => {
    if (session) {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch (error) {
        console.error('Error saving session:', error);
        setError('Failed to save session state');
      }
    }
  }, [session]);

  const startNewSession = useCallback(async (initialData) => {
    try {
      const newSession = {
        ...initialSessionState,
        id: `session_${Date.now()}`,
        startTime: new Date().toISOString(),
        videos: initialData.videos,
        analysis: initialData.analysis,
        // FIX: Use selectedLanguage from initialData instead of language.
        selectedLanguage: initialData.selectedLanguage || 'english'
      };

      setSession(newSession);
      setError(null);
      return newSession;
    } catch (error) {
      console.error('Error starting new session:', error);
      setError('Failed to start new session');
      throw error;
    }
  }, []);

  const updateSession = useCallback(async (updates) => {
    try {
      setSession(currentSession => {
        if (!currentSession) {
          throw new Error('No active session');
        }

        const updatedSession = {
          ...currentSession,
          ...updates,
          progress: {
            ...currentSession.progress,
            ...(updates.progress || {})
          }
        };

        return updatedSession;
      });
      
      setError(null);
    } catch (error) {
      console.error('Error updating session:', error);
      setError('Failed to update session');
      throw error;
    }
  }, []);

  const clearSession = useCallback(async () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
      setError(null);
    } catch (error) {
      console.error('Error clearing session:', error);
      setError('Failed to clear session');
      throw error;
    }
  }, []);

  const addToHistory = useCallback(async (historyEntry) => {
    try {
      setSession(currentSession => {
        if (!currentSession) {
          throw new Error('No active session');
        }

        return {
          ...currentSession,
          progress: {
            ...currentSession.progress,
            history: [
              ...currentSession.progress.history,
              {
                ...historyEntry,
                timestamp: new Date().toISOString()
              }
            ]
          }
        };
      });
    } catch (error) {
      console.error('Error adding to history:', error);
      setError('Failed to update learning history');
      throw error;
    }
  }, []);

  const updateProgress = useCallback(async (progressUpdate) => {
    try {
      setSession(currentSession => {
        if (!currentSession) {
          throw new Error('No active session');
        }

        return {
          ...currentSession,
          progress: {
            ...currentSession.progress,
            ...progressUpdate
          }
        };
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      setError('Failed to update progress');
      throw error;
    }
  }, []);

  // Recovery methods
  const getLastValidState = useCallback(() => {
    if (!session) return null;
    
    return {
      videoIndex: session.progress.currentVideoIndex,
      segmentIndex: session.progress.currentSegmentIndex,
      history: session.progress.history,
      selectedLanguage: session.selectedLanguage  // Added language to recovery state
    };
  }, [session]);

  const resetToLastValidState = useCallback(async () => {
    const lastState = getLastValidState();
    if (lastState) {
      await updateProgress(lastState);
    }
  }, [getLastValidState, updateProgress]);

  return {
    session,
    error,
    startNewSession,
    updateSession,
    clearSession,
    addToHistory,
    updateProgress,
    getLastValidState,
    resetToLastValidState
  };
};

export default useLearningSession;
