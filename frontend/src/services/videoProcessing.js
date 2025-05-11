// services/videoProcessing.js
const API_BASE_URL = 'https://backend-dot-edu-play-video.uc.r.appspot.com';
const PROCESSING_DELAY = 1000; // 1 second delay between videos

export const processVideos = async (videos, onStatusUpdate) => {
  const results = [];
  
  for (let i = 0; i < videos.length; i++) {
    try {
      // Update status for current video
      onStatusUpdate?.(i, 'Initializing analysis...');
      
      // Process single video
      const result = await processVideo(videos[i].url, (step) => {
        onStatusUpdate?.(i, step);
      });
      
      results.push({
        url: videos[i].url,
        ...result
      });

      // Add delay between videos to prevent rate limiting
      if (i < videos.length - 1) {
        onStatusUpdate?.(i, 'Processing complete');
        await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
      }
    } catch (error) {
      console.error(`Error processing video ${i + 1}:`, error);
      throw new Error(`Error processing video ${i + 1}: ${error.message}`);
    }
  }

  return results;
};

const processVideo = async (url, onStepUpdate) => {
  try {
    onStepUpdate?.('Sending video for analysis...');
    
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze video');
    }

    onStepUpdate?.('Processing content...');
    const data = await response.json();
    
    // Validate response data
    validateVideoAnalysis(data);

    return data;
  } catch (error) {
    console.error('Video processing error:', error);
    throw error;
  }
};

const validateVideoAnalysis = (data) => {
  if (!data.segments || !Array.isArray(data.segments)) {
    throw new Error('Invalid response format: missing segments array');
  }

  data.segments.forEach((segment, index) => {
    const requiredFields = ['timestamp', 'question', 'answers', 'praise', 'explanation'];
    for (const field of requiredFields) {
      if (!(field in segment)) {
        throw new Error(`Invalid segment ${index + 1}: missing ${field}`);
      }
    }

    if (!Array.isArray(segment.answers) || segment.answers.length !== 4) {
      throw new Error(`Invalid segment ${index + 1}: answers must be an array of 4 items`);
    }

    if (typeof segment.timestamp !== 'string' || !segment.timestamp.match(/^\d+:\d+$/)) {
      throw new Error(`Invalid segment ${index + 1}: invalid timestamp format`);
    }
  });
};

export const getSpeechAudio = async (text) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Speech synthesis failed');
    }

    return await response.blob();
  } catch (error) {
    console.error('Speech synthesis error:', error);
    throw error;
  }
};

export default {
  processVideos,
  processVideo,
  getSpeechAudio
};