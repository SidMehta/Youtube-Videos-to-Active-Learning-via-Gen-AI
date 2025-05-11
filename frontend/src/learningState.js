// learningState.js
export const AudioState = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  ERROR: 'error'
};

export const CharacterState = {
  IDLE: 'idle',
  SPEAKING: 'speaking',
  CORRECT: 'correct',
  WRONG: 'wrong'
};

export const ActionTypes = {
  START_AUDIO: 'START_AUDIO',
  STOP_AUDIO: 'STOP_AUDIO',
  SELECT_ANSWER: 'SELECT_ANSWER',
  RESET_QUESTION: 'RESET_QUESTION',
  SET_ERROR: 'SET_ERROR',
  START_NEW_QUESTION: 'START_NEW_QUESTION',
  QUEUE_AUDIO: 'QUEUE_AUDIO',
  CLEAR_ERROR: 'CLEAR_ERROR',
  ENABLE_ANSWERS: 'ENABLE_ANSWERS'
};

export const initialState = {
  audioState: AudioState.IDLE,
  characterState: CharacterState.IDLE,
  isProcessing: false,
  selectedAnswer: null,
  currentQueue: null,
  error: null,
  questionActive: false,
  isAnswerSelectionEnabled: true
};

export function learningReducer(state, action) {
  switch (action.type) {
    case ActionTypes.START_AUDIO:
      return {
        ...state,
        audioState: AudioState.PLAYING,
        characterState: CharacterState.SPEAKING,
        isAnswerSelectionEnabled: false
      };

    case ActionTypes.STOP_AUDIO:
      return {
        ...state,
        audioState: AudioState.IDLE,
        characterState: action.nextCharacterState || CharacterState.IDLE
      };

    case ActionTypes.SELECT_ANSWER:
      return {
        ...state,
        selectedAnswer: action.answer,
        characterState: action.isCorrect ? CharacterState.CORRECT : CharacterState.WRONG,
        isAnswerSelectionEnabled: false
      };

    case ActionTypes.RESET_QUESTION:
      return {
        ...state,
        selectedAnswer: null,
        characterState: CharacterState.IDLE,
        audioState: AudioState.IDLE,
        questionActive: false,
        isAnswerSelectionEnabled: true,
        currentQueue: null
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.error,
        audioState: AudioState.ERROR,
        isProcessing: false,
        currentQueue: null
      };

    case ActionTypes.START_NEW_QUESTION:
      return {
        ...state,
        questionActive: true,
        characterState: CharacterState.SPEAKING,
        selectedAnswer: null,
        isAnswerSelectionEnabled: false
      };

    case ActionTypes.QUEUE_AUDIO:
      return {
        ...state,
        currentQueue: action.queue,
        audioState: AudioState.LOADING,
        isAnswerSelectionEnabled: false
      };

    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        audioState: AudioState.IDLE
      };

    case ActionTypes.ENABLE_ANSWERS:
      return {
        ...state,
        isAnswerSelectionEnabled: true,
        audioState: AudioState.IDLE
      };

    default:
      return state;
  }
}