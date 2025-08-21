import axios, { AxiosError } from 'axios';

export interface GroqResponse {
  text: string;
  transcribedText?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ElevenLabsResponse {
  audioUrl: string;
  audioBlob: Blob;
}

export class VoiceInteractionAPI {
  private static instance: VoiceInteractionAPI;
  private groqApiKey: string = '';
  private elevenLabsApiKey: string = '';

  private constructor() {}

  static getInstance(): VoiceInteractionAPI {
    if (!VoiceInteractionAPI.instance) {
      VoiceInteractionAPI.instance = new VoiceInteractionAPI();
    }
    return VoiceInteractionAPI.instance;
  }

  setApiKeys(groqKey: string, elevenLabsKey: string) {
    this.groqApiKey = groqKey;
    this.elevenLabsApiKey = elevenLabsKey;
  }

  private async convertBlobToWav(audioBlob: Blob): Promise<Blob> {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Convert to WAV format
          const wavBlob = this.audioBufferToWav(audioBuffer);
          resolve(wavBlob);
        } catch (error) {
          console.warn('Failed to convert to WAV, using original blob:', error);
          resolve(audioBlob);
        }
      };
      
      reader.readAsArrayBuffer(audioBlob);
    });
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channels = buffer.numberOfChannels;
    let offset = 0;
    
    // WAV header
    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
      offset += str.length;
    };
    
    writeString('RIFF');
    view.setUint32(offset, 36 + length * 2, true); offset += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, channels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * 2, true); offset += 4;
    view.setUint16(offset, 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString('data');
    view.setUint32(offset, length * 2, true); offset += 4;
    
    // PCM samples
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  async transcribeAndProcess(audioBlob: Blob): Promise<GroqResponse> {
    if (!this.groqApiKey) {
      throw new Error('Groq API key is not configured');
    }

    try {
      // Convert audio to WAV format for better compatibility
      const wavBlob = await this.convertBlobToWav(audioBlob);
      
      // Step 1: Transcribe audio
      const formData = new FormData();
      formData.append('file', wavBlob, 'audio.wav');
      formData.append('model', 'whisper-large-v3');
      formData.append('response_format', 'json');
      formData.append('language', 'en');

      console.log('Sending transcription request to Groq...');
      
      const transcriptionResponse = await axios.post(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
          },
          timeout: 30000,
        }
      );

      const transcribedText = transcriptionResponse.data.text;
      console.log('Transcribed text:', transcribedText);

      if (!transcribedText || transcribedText.trim().length === 0) {
        throw new Error('No speech was detected in the audio. Please try speaking more clearly.');
      }

      // Step 2: Process with chat completion
      console.log('Sending chat completion request...');
      
      const chatResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant. Provide clear, concise, and informative responses to user questions. Keep your responses conversational and engaging, but not too long.'
            },
            {
              role: 'user',
              content: transcribedText
            }
          ],
          model: 'llama3-8b-8192', // Using a more reliable model
          temperature: 0.7,
          max_tokens: 500,
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (!chatResponse.data.choices || chatResponse.data.choices.length === 0) {
        throw new Error('No response generated from AI model');
      }

      return {
        text: chatResponse.data.choices[0].message.content,
        transcribedText: transcribedText,
        usage: chatResponse.data.usage,
      };

    } catch (error) {
      console.error('Groq API Error:', error);
      
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          throw new Error('Invalid Groq API key. Please check your API key and try again.');
        } else if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.response?.status === 400) {
          const errorMessage = error.response?.data?.error?.message || 'Bad request to Groq API';
          throw new Error(`Groq API Error: ${errorMessage}`);
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. Please check your internet connection and try again.');
        }
      }
      
      throw new Error('Failed to process audio with Groq API. Please try again.');
    }
  }

  async convertTextToSpeech(text: string, voiceId: string = 'EXAVITQu4vr4xnSDxMaL'): Promise<ElevenLabsResponse> {
    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key is not configured');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for speech synthesis');
    }

    try {
      console.log('Converting text to speech...');
      
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text: text.substring(0, 2500), // Limit text length
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey,
          },
          responseType: 'blob',
          timeout: 30000,
        }
      );

      if (!response.data || response.data.size === 0) {
        throw new Error('Empty audio response received');
      }

      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        audioUrl,
        audioBlob,
      };

    } catch (error) {
      console.error('ElevenLabs API Error:', error);
      
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          throw new Error('Invalid ElevenLabs API key. Please check your API key and try again.');
        } else if (error.response?.status === 429) {
          throw new Error('ElevenLabs rate limit exceeded. Please wait a moment and try again.');
        } else if (error.response?.status === 422) {
          throw new Error('Invalid text input for speech synthesis.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('ElevenLabs request timeout. Please try again.');
        }
      }
      
      throw new Error('Failed to convert text to speech. Please try again.');
    }
  }
}
