import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

const PerformanceReport = ({ learningHistory, userName, onRestart }) => {
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateReport = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('https://backend-dot-edu-play-video.uc.r.appspot.com//api/generate-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            learningHistory,
            userName
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate report');
        }

        const data = await response.json();
        if (data.status === 'success') {
          setReportData(data.data);
        } else {
          throw new Error(data.error || 'Failed to generate report');
        }
      } catch (error) {
        console.error('Report generation error:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    generateReport();
  }, [learningHistory, userName]);

  // Calculate overall performance
  const overallScore = learningHistory.reduce((acc, entry) => {
    return acc + (entry.isCorrect ? 1 : 0);
  }, 0) / learningHistory.length * 100;

  return (
    <div className="min-h-screen w-full bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Learning Report for {userName}
          </h1>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-red-800">
                {error}
              </p>
            </div>
          ) : reportData ? (
            <div className="space-y-8">
              {/* Overall Score */}
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600">
                  {Math.round(overallScore)}%
                </div>
                <div className="text-gray-600 mt-2">
                  Overall Performance
                </div>
              </div>

              {/* Strengths */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Strengths
                </h2>
                <ul className="space-y-2">
                  {reportData.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded mr-2">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Areas for Improvement */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Areas for Improvement
                </h2>
                <ul className="space-y-2">
                  {reportData.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start">
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded mr-2">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Recommendations */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Recommendations for Parents
                </h2>
                <ul className="space-y-2">
                  {reportData.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}

          {/* Restart Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={onRestart}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start New Learning Session
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceReport;