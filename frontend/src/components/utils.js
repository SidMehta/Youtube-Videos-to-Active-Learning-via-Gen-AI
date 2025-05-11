// components/utils.js

export const validateYouTubeUrl = (url) => {
  try {
    const videoId = extractVideoId(url);
    return videoId !== null && videoId.length === 11;
  } catch {
    return false;
  }
};

export const extractVideoId = (url) => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    }
    return null;
  } catch {
    return null;
  }
};

export const convertTimestampToSeconds = (timestamp) => {
  try {
    const [minutes, seconds] = timestamp.split(':').map(Number);
    if (isNaN(minutes) || isNaN(seconds)) {
      throw new Error('Invalid timestamp format');
    }
    return minutes * 60 + seconds;
  } catch (error) {
    console.error('Timestamp conversion failed:', error);
    throw new Error('Invalid timestamp format');
  }
};

export const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const calculateProgress = (current, total) => {
  if (!total) return 0;
  return Math.round((current / total) * 100);
};

export const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const handleApiError = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'An error occurred');
  }
  return response;
};

export const retryWithDelay = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithDelay(fn, retries - 1, delay * 1.5);
  }
};