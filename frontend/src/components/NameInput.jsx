import React, { useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const NameInput = ({ onComplete, onBack, selectedLanguage }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateName = (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return 'Please enter your name';
    }
    if (trimmedName.length < 2) {
      return 'Name must be at least 2 characters long';
    }
    if (trimmedName.length > 50) {
      return 'Name must be less than 50 characters';
    }
    if (!/^[a-zA-Z\s-']+$/.test(trimmedName)) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      // Store name in localStorage for persistence
      localStorage.setItem('userName', name.trim());
      // Pass both name and selectedLanguage to onComplete
      await onComplete({ 
        name: name.trim(), 
        selectedLanguage // Include the language received as a prop
      });
    } catch (error) {
      setError('Failed to save name. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (error) {
      setError(null);
    }
  };

  const handleBackClick = () => {
    if (onBack) {
      // Clear any stored name
      localStorage.removeItem('userName');
      onBack();
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-center text-gray-900">
            What's Your Name?
          </h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
        
        <div className="w-full bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="name" 
                className="block text-sm font-medium text-gray-700"
              >
                Enter Your Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Type your name here..."
                  disabled={isSubmitting}
                  autoComplete="off"
                  autoFocus
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? 'name-error' : undefined}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4" id="name-error" role="alert">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      {error}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              <span className="flex items-center">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Let's Start Learning!
                    <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
                  </>
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NameInput;
