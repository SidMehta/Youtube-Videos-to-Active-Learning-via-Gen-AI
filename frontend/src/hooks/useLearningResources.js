import { useRef, useEffect, useCallback } from 'react';

export const useLearningResources = () => {
  const isMountedRef = useRef(true);
  const playerRef = useRef(null);
  const audioRef = useRef(null);
  const timeoutRefs = useRef([]);
  const retryCountRef = useRef({});
  const blobUrlsRef = useRef([]);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load(); // Force cleanup
        audioRef.current = null;
      } catch (error) {
        console.error('Audio cleanup error:', error);
      }
    }

    // Cleanup blob URLs
    blobUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Blob URL cleanup error:', error);
      }
    });
    blobUrlsRef.current = [];
  }, []);

  const cleanupPlayer = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
        playerRef.current.destroy();
      } catch (error) {
        console.error('Player cleanup error:', error);
      }
      playerRef.current = null;
    }
  }, []);

  const cleanupTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeoutId => {
      try {
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('Timeout cleanup error:', error);
      }
    });
    timeoutRefs.current = [];
  }, []);

  // Register a new timeout and return its ID
  const registerTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
    timeoutRefs.current.push(timeoutId);
    return timeoutId;
  }, []);

  // Register a blob URL for cleanup
  const registerBlobUrl = useCallback((url) => {
    blobUrlsRef.current.push(url);
    return url;
  }, []);

  // Clean up all resources
  const cleanup = useCallback(() => {
    cleanupAudio();
    cleanupPlayer();
    cleanupTimeouts();
    retryCountRef.current = {};
  }, [cleanupAudio, cleanupPlayer, cleanupTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    isMountedRef,
    playerRef,
    audioRef,
    retryCountRef,
    registerTimeout,
    registerBlobUrl,
    cleanup,
    cleanupAudio,
    cleanupPlayer,
    cleanupTimeouts
  };
};

export default useLearningResources;