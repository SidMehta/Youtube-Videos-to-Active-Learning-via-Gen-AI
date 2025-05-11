// components/learningQueueState.js
import { ActionTypes, CharacterState, AudioState, learningReducer } from './learningState';

export const QueueActionTypes = {
  ...ActionTypes,
  NEXT_VIDEO: 'NEXT_VIDEO',
  PREVIOUS_VIDEO: 'PREVIOUS_VIDEO',
  START_VIDEO: 'START_VIDEO',
  END_VIDEO: 'END_VIDEO',
  RECORD_ANSWER: 'RECORD_ANSWER',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  END_LEARNING: 'END_LEARNING',
  RESTORE_STATE: 'RESTORE_STATE'
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
  lastSavedState: null,
  // Include base state
  audioState: AudioState.IDLE,
  characterState: CharacterState.IDLE,
  isAnswerSelectionEnabled: true,
  error: null
};

// Helper function to save state to localStorage
const saveStateToStorage = (state) => {
  try {
    const stateToSave = {
      currentVideoIndex: state.currentVideoIndex,
      currentSegmentIndex: state.currentSegmentIndex,
      learningHistory: state.learningHistory,
      totalVideos: state.totalVideos,
      lastSavedTime: Date.now()
    };
    localStorage.setItem('learningQueueState', JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Failed to save state:', error);
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
        return parsed;
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

  switch (action.type) {
    case QueueActionTypes.NEXT_VIDEO:
      newState = {
        ...state,
        currentVideoIndex: state.currentVideoIndex + 1,
        currentSegmentIndex: 0,
        showVideoTransition: true,
        showQuestion: false,
        characterState: CharacterState.IDLE,
        audioState: AudioState.IDLE,
        isAnswerSelectionEnabled: true,
        isVideoEnded: false
      };
      break;

    case QueueActionTypes.START_VIDEO:
      newState = {
        ...state,
        showVideoTransition: false,
        showQuestion: false,
        isVideoEnded: false
      };
      break;

    case QueueActionTypes.END_VIDEO:
      newState = {
        ...state,
        isVideoEnded: true,
        showQuestion: false,
        showCharacter: false
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
        }]
      };
      break;

    case QueueActionTypes.UPDATE_PROGRESS:
      newState = {
        ...state,
        ...action.payload
      };
      break;

    case QueueActionTypes.END_LEARNING:
      newState = {
        ...state,
        isLearningComplete: true,
        showQuestion: false,
        showCharacter: false
      };
      break;

    case QueueActionTypes.RESTORE_STATE:
      const savedState = loadStateFromStorage();
      if (savedState) {
        newState = {
          ...state,
          ...savedState,
          error: null
        };
      } else {
        newState = state;
      }
      break;

    default:
      // Handle base learning state actions
      return learningReducer(state, action);
  }

  // Save state after each action
  saveStateToStorage(newState);
  return newState;
}