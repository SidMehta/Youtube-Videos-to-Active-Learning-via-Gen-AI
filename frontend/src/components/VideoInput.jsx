import React, { useState, useRef, useEffect } from 'react';
import { Play, Plus, X, Cloud, Calculator } from 'lucide-react';
import { validateYouTubeUrl } from './utils';
import ProcessingStatus from './ProcessingStatus';

const SUGGESTED_VIDEOS = [
  {
    id: 'zBnKgwnn7i4',
    title: "How does rain form and what is the water cycle?",
    description: "Learn about weather and the water cycle (2 mins)",
    url: "https://www.youtube.com/watch?v=zBnKgwnn7i4",
    icon: Cloud
  },
  {
    id: '4lkq3DgvmJo',
    title: "Math Antics - Dividing Fractions",
    description: "Learn how to divide fractions step by step (5 mins)",
    url: "https://www.youtube.com/watch?v=4lkq3DgvmJo",
    icon: Calculator
  }
];

// New constant: Language options available for explanations
const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English Only' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'hindi', label: 'Hindi' }
];

const VideoInput = ({ onComplete }) => {
  const [videos, setVideos] = useState([{ url: '', isRequired: true }]);
  const [processingStatus, setProcessingStatus] = useState({
    isProcessing: false,
    currentVideo: -1,
    currentStep: '',
    error: null
  });
  
  // New state for the language selection
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  
  const abortControllerRef = useRef(null);
  
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAddVideo = () => {
    if (videos.length < 4) {
      setVideos([...videos, { url: '', isRequired: false }]);
    }
  };

  const handleRemoveVideo = (index) => {
    const newVideos = videos.filter((_, i) => i !== index);
    if (newVideos.length === 0) {
      newVideos.push({ url: '', isRequired: true });
    }
    setVideos(newVideos);
  };

  const handleUrlChange = (index, value) => {
    const newVideos = [...videos];
    newVideos[index] = { ...newVideos[index], url: value };
    setVideos(newVideos);
  };

  const handleSuggestedVideoClick = (videoUrl) => {
    // Find the first empty input
    const emptyIndex = videos.findIndex(video => !video.url);
    
    if (emptyIndex === -1) {
      // If no empty inputs, add a new one if possible
      if (videos.length < 4) {
        setVideos([...videos, { url: videoUrl, isRequired: false }]);
      }
    } else {
      // Fill the first empty input
      handleUrlChange(emptyIndex, videoUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validVideos = videos.filter(video => video.url.trim());
    const invalidUrl = validVideos.find(video => !validateYouTubeUrl(video.url));
    
    if (invalidUrl) {
      setProcessingStatus(prev => ({
        ...prev,
        error: 'Please ensure all video URLs are valid YouTube URLs'
      }));
      return;
    }

    if (!validVideos.length) {
      setProcessingStatus(prev => ({
        ...prev,
        error: 'Please enter at least one video URL'
      }));
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setProcessingStatus({
      isProcessing: true,
      currentVideo: 0,
      currentStep: 'Starting analysis...',
      error: null
    });

    try {
      const response = await fetch('https://backend-dot-edu-play-video.uc.r.appspot.com/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Include language in the payload
        body: JSON.stringify({ 
          videos: validVideos.map(v => v.url),
          language: selectedLanguage 
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to analyze videos');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        onComplete({
          videos: validVideos,
          results: data.results,
          selectedLanguage: selectedLanguage
        });
      } else {
        throw new Error(data.error || 'Failed to analyze videos');
      }

    } catch (error) {
      console.error('Video analysis error:', error);
      
      let errorMessage = 'An error occurred while processing the videos.';
      if (error.name === 'AbortError') {
        errorMessage = 'Video processing was cancelled.';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your connection and try again.';
      }

      setProcessingStatus(prev => ({
        ...prev,
        error: errorMessage
      }));
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setProcessingStatus(prev => ({
          ...prev,
          isProcessing: false,
          currentVideo: -1,
          currentStep: ''
        }));
      }
    }
  };

  if (processingStatus.isProcessing) {
    return (
      <ProcessingStatus
        videos={videos.filter(v => v.url.trim())}
        currentStatus={processingStatus}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
            EduPlay - Turn free videos into personalized learning assistant!
          </h1>

          {/* Suggested Videos Section */}
          <div className="mb-8">
            <p className="text-center text-gray-600 mb-4">
              New here? Try these educational videos to get started:
            </p>
            <div className="space-y-3">
              {SUGGESTED_VIDEOS.map((video) => {
                const Icon = video.icon;
                return (
                  <button 
                    key={video.id}
                    onClick={() => handleSuggestedVideoClick(video.url)}
                    className="w-full flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100 hover:border-blue-200"
                  >
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="text-left flex-grow">
                      <div className="font-medium text-blue-600">{video.title}</div>
                      <div className="text-sm text-gray-500">{video.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-center text-sm text-gray-500">
              Click any video above to automatically fill the URL box below
            </div>
          </div>

          {/* Video URL Inputs */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {videos.map((video, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-grow">
                  <label htmlFor={`video-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                    Video {index + 1} URL {video.isRequired && '*'}
                  </label>
                  <input
                    type="text"
                    id={`video-${index}`}
                    value={video.url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    placeholder="Enter YouTube URL or click a suggested video above"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required={video.isRequired}
                  />
                </div>
                {!video.isRequired && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVideo(index)}
                    className="mt-7 p-2 text-gray-400 hover:text-red-500"
                  >
                    <span className="sr-only">Remove video</span>
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}

            {videos.length < 4 && (
              <button
                type="button"
                onClick={handleAddVideo}
                className="flex items-center text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Another Video
              </button>
            )}

            {processingStatus.error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{processingStatus.error}</p>
              </div>
            )}

            {/* Language Selection */}
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    Select Language for Detailed Explanations
  </label>
  <select
    value={selectedLanguage}
    onChange={(e) => setSelectedLanguage(e.target.value)}
    disabled={processingStatus.isProcessing}
    className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md ${
      processingStatus.isProcessing ? 'bg-gray-100 cursor-not-allowed' : ''
    }`}
  >
    {LANGUAGE_OPTIONS.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
  <p className="text-sm text-gray-500">
    Explanations will be provided in both English and your selected language
  </p>
</div>

            <button
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Learning
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VideoInput;
