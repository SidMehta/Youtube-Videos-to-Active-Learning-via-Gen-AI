/**
 * AudioContext wrapper utility for iOS compatibility
 */
import { isIOS } from './iOSDetection';

// Store initialization state
let audioInitialized = false;

/**
 * Initializes audio on iOS devices
 * This must be called from a user interaction event handler
 * @returns {Promise<boolean>} Resolves to true if initialization successful
 */
export const initAudioForIOS = async () => {
  if (audioInitialized || !isIOS()) {
    return true;
  }
  
  try {
    // Use window.AudioContext with fallback
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    
    // iOS requires audio context to be resumed from user interaction
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Play a silent sound to unlock audio
    const silentPing = async () => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      // Set gain to nearly silent
      gain.gain.value = 0.01;
      
      // Connect and start
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(0);
      oscillator.stop(0.5);
      
      // Return promise that resolves when oscillator ends
      return new Promise(resolve => {
        setTimeout(() => {
          oscillator.disconnect();
          gain.disconnect();
          resolve(true);
        }, 600);
      });
    };
    
    await silentPing();
    
    // Create and play several dummy audio elements for deeper iOS unlocking
    for (let i = 0; i < 3; i++) {
      const unlockAudio = document.createElement('audio');
      unlockAudio.controls = false;
      unlockAudio.loop = false;
      unlockAudio.muted = i < 2; // Last one unmuted for deeper unlock
      unlockAudio.volume = 0.1;
      const source = unlockAudio.src = `data:audio/mp3;base64,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`;
      document.body.appendChild(unlockAudio);
      
      try {
        const playPromise = unlockAudio.play();
        if (playPromise) {
          await playPromise;
        }
      } catch (e) {
        console.log('Audio init play error (expected):', e);
      }
      
      // Cleanup after a short delay
      setTimeout(() => {
        document.body.removeChild(unlockAudio);
      }, 1000);
    }
    
    audioInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize audio:', error);
    return false;
  }
};

/**
 * Checks if audio has been initialized
 * @returns {boolean} true if audio has been initialized
 */
export const isAudioInitialized = () => {
  return audioInitialized;
};