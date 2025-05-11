// services/textToSpeech.js
import { isIOS } from '../utils/iOSDetection';
import { isAudioInitialized } from '../utils/audioContext';

class AudioQueue {
  constructor() {
    this.queue = [];
    this.isPlaying = false;
    this.currentAudio = null;
    this.abortController = null;
  }

  async add(text) {
    this.queue.push(text);
    if (!this.isPlaying) {
      await this.processQueue();
    }
  }

  async clear() {
    this.queue = [];
    await this.cleanupCurrentAudio();
    this.isPlaying = false;
  }

  async cleanupCurrentAudio() {
    if (this.currentAudio) {
      try {
        // Pause current audio
        await this.currentAudio.pause();
        // Immediately clear the audio source and unload it
        this.currentAudio.src = '';
        this.currentAudio.load();
        this.currentAudio = null;
      } catch (error) {
        console.error('Audio cleanup error:', error);
      }
    }
    // Clear the queue when audio is stopped
    this.queue = [];
    this.isPlaying = false;
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const text = this.queue[0];

    try {
      await this.speakText(text);
    } catch (error) {
      console.error('Error processing audio:', error);
      // Remove failed item and continue with queue
      this.queue.shift();
    }

    if (this.queue.length > 0) {
      this.queue.shift();
      await this.processQueue();
    } else {
      this.isPlaying = false;
    }
  }

  async speakText(text) {
    if (!text) {
      throw new Error('No text provided for speech synthesis');
    }

    // Check if audio is available on iOS
    if (isIOS() && !isAudioInitialized()) {
      console.warn('Audio not initialized. Speech may not work on iOS.');
    }

    // Create new abort controller for this request
    this.abortController = new AbortController();

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Speech synthesis failed');
      }

      const audioBlob = await response.blob();
      await this.cleanupCurrentAudio();
      
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        this.currentAudio = audio;
        
        const url = URL.createObjectURL(audioBlob);
        const cleanup = () => {
          URL.revokeObjectURL(url);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          audio.removeEventListener('pause', handlePause);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
        };

        const handleEnded = () => {
          cleanup();
          resolve();
        };

        const handleError = (error) => {
          cleanup();
          reject(new Error('Failed to play audio: ' + error.message));
        };

        const handlePause = () => {
          // Only cleanup if this is still the current audio
          if (this.currentAudio === audio) {
            cleanup();
            resolve();
          }
        };
        
        // iOS-specific: Use timeupdate as backup for ended event
        const handleTimeUpdate = () => {
          if (isIOS() && audio.currentTime >= audio.duration - 0.1) {
            cleanup();
            resolve();
          }
        };

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('pause', handlePause);
        
        // Add iOS-specific event listener
        if (isIOS()) {
          audio.addEventListener('timeupdate', handleTimeUpdate);
        }
        
        audio.src = url;
        
        // iOS fix: Force reload the audio element
        if (isIOS()) {
          audio.load();
        }
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(handleError);
        }
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Audio playback was cancelled');
      }
      throw new Error('Failed to generate speech: ' + error.message);
    }
  }
}

const API_URL = 'https://backend-dot-edu-play-video.uc.r.appspot.com/api/speak';
export const audioQueue = new AudioQueue();

export const speakText = async (text) => {
  if (!text) {
    throw new Error('No text provided for speech synthesis');
  }
  await audioQueue.add(text);
};

export const queueSpeech = async (texts) => {
  if (!Array.isArray(texts)) {
    texts = [texts];
  }

  await audioQueue.clear();
  for (const text of texts) {
    await audioQueue.add(text);
  }
};

// Add error types for better error handling
export const AudioError = {
  SYNTHESIS_FAILED: 'SYNTHESIS_FAILED',
  PLAYBACK_FAILED: 'PLAYBACK_FAILED',
  CANCELLED: 'CANCELLED',
  NETWORK_ERROR: 'NETWORK_ERROR'
};

export default {
  speakText,
  queueSpeech,
  audioQueue,
  AudioError
};