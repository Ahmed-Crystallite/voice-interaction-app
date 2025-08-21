# Voice Interaction AI App

A full-stack web application that enables voice-based interactions using Groq Cloud API for transcription and processing, and ElevenLabs for text-to-speech conversion.

## Features

- 🎤 **Voice Recording**: Capture audio input with start/pause/stop controls
- 🤖 **AI Processing**: Transcribe and process voice using Groq's Whisper and Mixtral models
- 🔊 **Text-to-Speech**: Convert AI responses to natural speech using ElevenLabs
- ⏯️ **Audio Playback**: Play, pause, and download generated audio responses
- 📝 **Text Editing**: Review and edit AI responses before converting to speech
- 🎨 **Modern UI**: Beautiful interface built with Tailwind CSS and shadcn/ui
- 📱 **Responsive**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Audio**: Web MediaRecorder API, Web Audio API
- **AI Services**: Groq Cloud API (Whisper + Mixtral), ElevenLabs TTS API
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Groq API key (get from [console.groq.com](https://console.groq.com))
- ElevenLabs API key (get from [elevenlabs.io](https://elevenlabs.io))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Ahmed-Crystallite/voice-interaction-app.git
cd voice-interaction-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your API keys
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### API Configuration

When you first run the app, you'll be prompted to enter your API keys:

1. **Groq API Key**: Used for audio transcription (Whisper) and text processing (Mixtral)
2. **ElevenLabs API Key**: Used for text-to-speech conversion

## Usage

1. **Record Voice**: Click "Start Recording" to capture your voice input
2. **Process Audio**: Click "Process Audio" to send to Groq for transcription and AI response
3. **Review Response**: The AI's text response will appear, which you can edit if needed
4. **Generate Speech**: The text is automatically converted to speech using ElevenLabs
5. **Play Audio**: Use the play button to hear the AI's response
6. **Download**: Save the audio response as an MP3 file

## Project Structure

```
voice-interaction-app/
├── app/                    # Next.js 15.5.0 App Directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/
│   ├── ui/                # shadcn/ui components
│   └── VoiceInteractionApp.tsx  # Main app component
├── hooks/
│   └── useVoiceRecorder.ts # Voice recording hook
├── lib/
│   ├── api.ts            # API integration classes
│   └── utils.ts          # Utility functions
├── package.json
├── tsconfig.json
└── next.config.js
```

## API Integration

### Groq Cloud API
- **Transcription**: Uses Whisper-large-v3 model for audio-to-text
- **Chat Completion**: Uses Mixtral-8x7b model for intelligent responses

### ElevenLabs API
- **Text-to-Speech**: Converts AI responses to natural-sounding speech
- **Voice Customization**: Supports different voices and speech settings

## Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel
vercel deploy
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Groq](https://groq.com) for fast AI inference
- [ElevenLabs](https://elevenlabs.io) for realistic text-to-speech
- [shadcn/ui](https://ui.shadcn.com) for beautiful UI components
- [Next.js](https://nextjs.org) for the React framework