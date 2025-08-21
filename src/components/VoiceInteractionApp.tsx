'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Download, 
  Volume2, 
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { VoiceInteractionAPI, type GroqResponse, type ElevenLabsResponse } from '@/lib/api';

interface ApiKeys {
  groq: string;
  elevenLabs: string;
}

export default function VoiceInteractionApp() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ groq: '', elevenLabs: '' });
  const [showSettings, setShowSettings] = useState(true);
  const [responseText, setResponseText] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioResponse, setAudioResponse] = useState<ElevenLabsResponse | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const api = VoiceInteractionAPI.getInstance();

  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    isSupported,
  } = useVoiceRecorder();

  useEffect(() => {
    if (apiKeys.groq && apiKeys.elevenLabs) {
      api.setApiKeys(apiKeys.groq, apiKeys.elevenLabs);
      setShowSettings(false);
    }
  }, [apiKeys]);

  useEffect(() => {
    if (audioResponse?.audioUrl && audioRef.current) {
      audioRef.current.src = audioResponse.audioUrl;
    }
  }, [audioResponse]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      setError(null);
      await startRecording();
    } catch (error) {
      setError('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const handleProcessAudio = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    setError(null);
    setResponseText('');
    setTranscribedText('');
    setAudioResponse(null);
    setDebugInfo('');

    try {
      // Add debug information
      setDebugInfo(`Audio blob size: ${audioBlob.size} bytes, Type: ${audioBlob.type}`);
      
      setProcessingStage('Transcribing and processing with Groq...');
      const groqResponse: GroqResponse = await api.transcribeAndProcess(audioBlob);
      
      setTranscribedText(groqResponse.transcribedText || '');
      setResponseText(groqResponse.text);
      setDebugInfo(prev => prev + `\nTranscribed: "${groqResponse.transcribedText}"`);
      
      setProcessingStage('Generating speech with ElevenLabs...');
      setIsGeneratingAudio(true);
      const ttsResponse: ElevenLabsResponse = await api.convertTextToSpeech(groqResponse.text);
      setAudioResponse(ttsResponse);
      
      setProcessingStage('Complete!');
      setDebugInfo(prev => prev + '\nAudio generation successful!');
    } catch (error) {
      console.error('Processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      setDebugInfo(prev => prev + `\nError: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
      setIsGeneratingAudio(false);
      setProcessingStage('');
    }
  };

  const handlePlayAudio = () => {
    if (!audioRef.current) return;

    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleDownloadAudio = () => {
    if (!audioResponse) return;

    const link = document.createElement('a');
    link.href = audioResponse.audioUrl;
    link.download = 'voice-response.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    clearRecording();
    setResponseText('');
    setAudioResponse(null);
    setError(null);
    setIsPlayingAudio(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Enter your API keys to get started with voice interactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Groq API Key</label>
              <Textarea
                placeholder="Enter your Groq API key..."
                value={apiKeys.groq}
                onChange={(e) => setApiKeys(prev => ({ ...prev, groq: e.target.value }))}
                className="min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">ElevenLabs API Key</label>
              <Textarea
                placeholder="Enter your ElevenLabs API key..."
                value={apiKeys.elevenLabs}
                onChange={(e) => setApiKeys(prev => ({ ...prev, elevenLabs: e.target.value }))}
                className="min-h-[60px]"
              />
            </div>
            <Button
              onClick={() => {
                if (apiKeys.groq && apiKeys.elevenLabs) {
                  setShowSettings(false);
                }
              }}
              disabled={!apiKeys.groq || !apiKeys.elevenLabs}
              className="w-full"
            >
              Continue
            </Button>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Get Groq API key from: console.groq.com</p>
              <p>• Get ElevenLabs API key from: elevenlabs.io</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Voice Interaction AI
            </h1>
            <p className="text-lg text-gray-600">
              Speak, process with Groq, and hear AI responses with ElevenLabs
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="mt-4"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Processing Status */}
          {(isProcessing || isGeneratingAudio) && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">{processingStage}</p>
                    <Progress value={isProcessing ? 50 : 100} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voice Recording Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Input
              </CardTitle>
              <CardDescription>
                Record your voice to start the interaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                {/* Recording Controls */}
                <div className="flex items-center gap-4">
                  {!isRecording ? (
                    <Button
                      onClick={handleStartRecording}
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Mic className="h-5 w-5 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      {!isPaused ? (
                        <Button onClick={pauseRecording} variant="outline" size="lg">
                          <Pause className="h-5 w-5 mr-2" />
                          Pause
                        </Button>
                      ) : (
                        <Button onClick={resumeRecording} size="lg">
                          <Play className="h-5 w-5 mr-2" />
                          Resume
                        </Button>
                      )}
                      <Button 
                        onClick={stopRecording} 
                        variant="destructive" 
                        size="lg"
                      >
                        <Square className="h-5 w-5 mr-2" />
                        Stop
                      </Button>
                    </div>
                  )}
                </div>

                {/* Recording Status */}
                {isRecording && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">
                        {isPaused ? 'Recording Paused' : 'Recording...'}
                      </span>
                    </div>
                    <p className="text-2xl font-mono">{formatTime(recordingTime)}</p>
                  </div>
                )}

                {/* Audio Blob Status */}
                {audioBlob && !isRecording && (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Recording Complete ({formatTime(recordingTime)})</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={handleProcessAudio}
                        disabled={isProcessing || isGeneratingAudio}
                        size="lg"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <Volume2 className="h-5 w-5 mr-2" />
                        )}
                        Process Audio
                      </Button>
                      <Button onClick={clearRecording} variant="outline" size="lg">
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Response Text Section */}
          {responseText && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  AI Response
                </CardTitle>
                <CardDescription>
                  Generated response from Groq AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="min-h-[120px] mb-4"
                  placeholder="AI response will appear here..."
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => api.convertTextToSpeech(responseText).then(setAudioResponse)}
                    disabled={isGeneratingAudio}
                    variant="outline"
                  >
                    {isGeneratingAudio ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4 mr-2" />
                    )}
                    Regenerate Audio
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audio Playback Section */}
          {audioResponse && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  Audio Response
                </CardTitle>
                <CardDescription>
                  Generated speech from ElevenLabs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handlePlayAudio}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isPlayingAudio ? (
                      <Pause className="h-5 w-5 mr-2" />
                    ) : (
                      <Play className="h-5 w-5 mr-2" />
                    )}
                    {isPlayingAudio ? 'Pause' : 'Play'}
                  </Button>
                  
                  <Button
                    onClick={handleDownloadAudio}
                    variant="outline"
                    size="lg"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download
                  </Button>

                  <audio
                    ref={audioRef}
                    onEnded={() => setIsPlayingAudio(false)}
                    onPause={() => setIsPlayingAudio(false)}
                    onPlay={() => setIsPlayingAudio(true)}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reset Button */}
          {(audioBlob || responseText || audioResponse) && (
            <div className="text-center">
              <Button
                onClick={handleReset}
                variant="outline"
                size="lg"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Start New Conversation
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}