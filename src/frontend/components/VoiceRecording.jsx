import React, { useState, useEffect } from 'react';

function VoiceRecording({ onVoiceInput, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check for speech recognition support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      initializeSpeechRecognition();
    }
  }, []);

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'en-US';

    recognitionInstance.onstart = () => {
      setIsRecording(true);
    };

    recognitionInstance.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onVoiceInput(transcript);
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognitionInstance.onend = () => {
      setIsRecording(false);
    };

    setRecognition(recognitionInstance);
  };

  const toggleRecording = () => {
    if (!recognition || disabled) return;

    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  if (!isSupported) {
    return null; // Hide voice button if not supported
  }

  return (
    <button
      type="button"
      className={`voice-button ${isRecording ? 'recording' : ''}`}
      onClick={toggleRecording}
      disabled={disabled}
      title={isRecording ? 'Stop recording' : 'Start voice input'}
    >
      {isRecording ? '🔴' : '🎤'}
    </button>
  );
}

export default VoiceRecording;