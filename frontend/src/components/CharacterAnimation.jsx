import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMediaQuery } from 'react-responsive';
import { CharacterState } from './learningState';

const DEBUG = true;
const debugLog = (...args) => {
  if (DEBUG) {
    console.log('[CharacterAnimation]', ...args);
  }
};

const GIF_URL = '/animations/speaking.gif';

const CharacterAnimation = ({ state, visible, isPlaying }) => {
  debugLog('Rendering with state:', state, 'visible:', visible, 'isPlaying:', isPlaying);
  
  const [isLoading, setIsLoading] = useState(true);
  const [gifUrl, setGifUrl] = useState(null);
  const mountedRef = useRef(true);
  const cachedBlobUrlRef = useRef(null);
  const characterRef = useRef(null);

  // Responsive breakpoints
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isPortrait = useMediaQuery({ orientation: 'portrait' });

  const loadGif = useCallback(async () => {
    // If already cached, use it
    if (cachedBlobUrlRef.current) {
      setGifUrl(cachedBlobUrlRef.current);
      setIsLoading(false);
      return;
    }

    debugLog('Loading speaking.gif');
    try {
      const response = await fetch(GIF_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      if (mountedRef.current) {
        cachedBlobUrlRef.current = blobUrl;
        setGifUrl(blobUrl);
        setIsLoading(false);
        debugLog('GIF loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load speaking.gif:', error);
      setIsLoading(false);
    }
  }, []);

  // Load GIF once on mount
  useEffect(() => {
    loadGif();

    return () => {
      debugLog('Component unmounting');
      mountedRef.current = false;
      
      // Cleanup blob URL
      if (cachedBlobUrlRef.current) {
        debugLog('Revoking blob URL');
        URL.revokeObjectURL(cachedBlobUrlRef.current);
        cachedBlobUrlRef.current = null;
      }
    };
  }, [loadGif]);

  // Handle responsive sizing
  useEffect(() => {
    if (characterRef.current) {
      const handleResize = () => {
        // Adjust character size based on device and orientation
        if (isMobile) {
          if (isPortrait) {
            characterRef.current.classList.remove('w-48', 'h-48');
            characterRef.current.classList.add('w-32', 'h-32');
          } else {
            characterRef.current.classList.remove('w-48', 'h-48', 'w-32', 'h-32');
            characterRef.current.classList.add('w-40', 'h-40');
          }
        } else {
          characterRef.current.classList.remove('w-32', 'h-32', 'w-40', 'h-40');
          characterRef.current.classList.add('w-48', 'h-48');
        }
      };
      
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile, isPortrait]);

  if (!visible) {
    return null;
  }

  // Determine container class based on device orientation
  const getContainerClass = () => {
    let baseClass = 'relative mx-auto';
    
    if (isMobile) {
      if (isPortrait) {
        return `${baseClass} w-32 h-32`;
      }
      return `${baseClass} w-40 h-40`;
    }
    
    return `${baseClass} w-48 h-48`;
  };

  return (
    <div 
      ref={characterRef}
      className={getContainerClass()} 
      role="img" 
      aria-label="Character"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {gifUrl && (
        <img 
          src={gifUrl}
          alt="Speaking character"
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            animationPlayState: isPlaying ? 'running' : 'paused',
            WebkitAnimationPlayState: isPlaying ? 'running' : 'paused',
            animationFillMode: 'forwards',
            WebkitAnimationFillMode: 'forwards'
          }}
        />
      )}
    </div>
  );
};

export default React.memo(CharacterAnimation, (prevProps, nextProps) => {
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.isPlaying === nextProps.isPlaying
  );
});