// components/learningQueueState.js
import { AudioState, CharacterState, learningReducer } from './learningState';

// Define all action types in one place
export const QueueActionTypes = {
  START_AUDIO: 'START_AUDIO',
  STOP_AUDIO: 'STOP_AUDIO',
  SELECT_ANSWER: 'SELECT_ANSWER',
  RESET_QUESTION: 'RESET_QUESTION',
  SET_ERROR: 'SET_ERROR',
  START_NEW_QUESTION: 'START_NEW_QUESTION',
  QUEUE_AUDIO: 'QUEUE_AUDIO',
  CLEAR_ERROR: 'CLEAR_ERROR',
  ENABLE_ANSWERS: 'ENABLE_ANSWERS',
  NEXT_VIDEO: 'NEXT_VIDEO',
  PREVIOUS_VIDEO: 'PREVIOUS_VIDEO',
  START_VIDEO: 'START_VIDEO',
  END_VIDEO: 'END_VIDEO',
  RECORD_ANSWER: 'RECORD_ANSWER',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  END_LEARNING: 'END_LEARNING',
  RESTORE_STATE: 'RESTORE_STATE',
  CLEAR_INTERVAL: 'CLEAR_INTERVAL',
  SET_LANGUAGE: 'SET_LANGUAGE'  // Added new action type
};

export const initialQueueState = {
  currentVideoIndex: 0,
  currentSegmentIndex: 0,
  totalVideos: 0,
  learningHistory: [],
  showVideoTransition: false,
  isLearningComplete: false,
  showCharacter: false,
  isVideoEnded: false,
  showQuestion: false,
  selectedAnswer: null,
  isBuffering: false,
  timeUpdateInterval: null,
  lastSavedState: null,
  audioState: AudioState.IDLE,
  characterState: CharacterState.IDLE,
  isAnswerSelectionEnabled: true,
  error: null,
  selectedLanguage: 'english'  // Added new state property
};

// Helper function for interval cleanup
const clearSafeInterval = (intervalId) => {
  if (intervalId && typeof intervalId === 'number') {
    clearInterval(intervalId);
    return null;
  }
  return intervalId;
};

// Helper function to save state to localStorage
const saveStateToStorage = (state) => {
  try {
    // Don't save timeUpdateInterval as it can't be serialized
    const { timeUpdateInterval, ...stateToSave } = state;
    const stateString = JSON.stringify({
      ...stateToSave,
      lastSavedTime: Date.now()
    });

    // Check size before saving (5MB is typical localStorage limit)
    if (stateString.length > 4.5 * 1024 * 1024) {
      // If too large, save minimal state
      const minimalState = {
        currentVideoIndex: state.currentVideoIndex,
        currentSegmentIndex: state.currentSegmentIndex,
        totalVideos: state.totalVideos,
        selectedLanguage: state.selectedLanguage,  // Include language in minimal state
        lastSavedTime: Date.now()
      };
      localStorage.setItem('learningQueueState', JSON.stringify(minimalState));
    } else {
      localStorage.setItem('learningQueueState', stateString);
    }
  } catch (error) {
    // If quota exceeded, clear old data and try minimal state
    if (error.name === 'QuotaExceededError') {
      try {
        localStorage.clear();
        const minimalState = {
          currentVideoIndex: state.currentVideoIndex,
          currentSegmentIndex: state.currentSegmentIndex,
          totalVideos: state.totalVideos,
          selectedLanguage: state.selectedLanguage,  // Include language in minimal state
          lastSavedTime: Date.now()
        };
        localStorage.setItem('learningQueueState', JSON.stringify(minimalState));
      } catch (e) {
        console.error('Failed to save even minimal state:', e);
      }
    } else {
      console.error('Failed to save state:', error);
    }
  }
};

// Helper function to load state from localStorage
const loadStateFromStorage = () => {
  try {
    const saved = localStorage.getItem('learningQueueState');
    if (saved) {
      const parsed = JSON.parse(saved);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - parsed.lastSavedTime < maxAge) {
        return {
          ...parsed,
          timeUpdateInterval: null // Ensure interval is null on restore
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to load state:', error);
    return null;
  }
};

export function learningQueueReducer(state, action) {
  let newState;

  // Clear existing interval if switching states that should reset the timer
  const shouldClearInterval = [
    QueueActionTypes.NEXT_VIDEO,
    QueueActionTypes.END_VIDEO,
    QueueActionTypes.END_LEARNING,
    QueueActionTypes.CLEAR_INTERVAL
  ].includes(action.type);

  if (shouldClearInterval) {
    state.timeUpdateInterval = clearSafeInterval(state.timeUpdateInterval);
  }

  switch (action.type) {
    case QueueActionTypes.SET_LANGUAGE:
      newState = {
        ...state,
        selectedLanguage: action.payload
      };
      break;

    case QueueActionTypes.NEXT_VIDEO:
      newState = {
        ...state,
        currentVideoIndex: state.currentVideoIndex + 1,
        currentSegmentIndex: 0,
        showVideoTransition: true,
        showQuestion: false,
        selectedAnswer: null,
        characterState: CharacterState.IDLE,
        audioState: AudioState.IDLE,
        isAnswerSelectionEnabled: true,
        isVideoEnded: false,
        isBuffering: false,
        timeUpdateInterval: null
      };
      break;

    case QueueActionTypes.START_VIDEO:
      newState = {
        ...state,
        showVideoTransition: false,
        showQuestion: false,
        isVideoEnded: false,
        isBuffering: false
      };
      break;

    case QueueActionTypes.END_VIDEO:
      newState = {
        ...state,
        isVideoEnded: true,
        showQuestion: false,
        showCharacter: false,
        timeUpdateInterval: null
      };
      break;

    case QueueActionTypes.RECORD_ANSWER:
      newState = {
        ...state,
        learningHistory: [...state.learningHistory, {
          ...action.payload,
          videoIndex: state.currentVideoIndex,
          segmentIndex: state.currentSegmentIndex,
          timestamp: Date.now()
        }],
        selectedAnswer: action.payload.answer,
        isAnswerSelectionEnabled: false
      };
      break;

    case QueueActionTypes.UPDATE_PROGRESS:
      // Handle interval updates safely
      let timeUpdateInterval = state.timeUpdateInterval;
      if ('timeUpdateInterval' in action.payload) {
        timeUpdateInterval = clearSafeInterval(state.timeUpdateInterval);
        if (action.payload.timeUpdateInterval) {
          timeUpdateInterval = action.payload.timeUpdateInterval;
        }
      }

      newState = {
        ...state,
        ...action.payload,
        timeUpdateInterval
      };
      break;

    case QueueActionTypes.END_LEARNING:
      newState = {
        ...state,
        isLearningComplete: true,
        showQuestion: false,
        showCharacter: false,
        timeUpdateInterval: null
      };
      break;

    case QueueActionTypes.CLEAR_INTERVAL:
      newState = {
        ...state,
        timeUpdateInterval: null
      };
      break;

    case QueueActionTypes.RESTORE_STATE:
      const savedState = loadStateFromStorage();
      if (savedState) {
        newState = {
          ...state,
          ...savedState,
          error: null,
          timeUpdateInterval: null
        };
      } else {
        newState = state;
      }
      break;

    default:
      return learningReducer(state, action);
  }

  // Save state after each action
  saveStateToStorage(newState);
  return newState;
}