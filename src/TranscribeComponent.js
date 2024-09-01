import React, { useState } from 'react';
import './TranscribeComponent.css';

const TranscribeComponent = () => {
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true);
    setError(null); // Clear any previous errors
    try {
      const response = await fetch('http://localhost:3001/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Extract transcript from the response
      const transcriptText = result.results.transcripts[0]?.transcript || 'No transcript available.';
      setTranscript(transcriptText);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="upload-container">
        <input type="file" accept="audio/*,video/*" onChange={handleVideoUpload} />
        {isLoading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Transcribing...</p>
          </div>
        )}
        {error && <p className="error-text">Error: {error}</p>}
        {!isLoading && !error && transcript && <><h2 className="error-text">Transcript:</h2> <h6 className="transcript-text">{transcript}</h6></>}
        {!isLoading && !error && !transcript && <p className="no-transcript-text">No transcript available.</p>}
      </div>
    </div>
  );
};

export default TranscribeComponent;
