
import React, { useState, useRef, useEffect } from 'react';
import { generateSpeech } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audio';
import Spinner from './components/Spinner';
import PlayIcon from './components/icons/PlayIcon';
import StopIcon from './components/icons/StopIcon';
import SoundWaveIcon from './components/icons/SoundWaveIcon';

interface Voice {
  name: string;
  gender: 'Female' | 'Male';
  previewText: string;
}

// Voices with gender and a short preview text
const voices: Voice[] = [
    { name: 'Kore', gender: 'Female', previewText: 'Hello, my name is Kore.' },
    { name: 'Puck', gender: 'Male', previewText: 'Hello, my name is Puck.' },
    { name: 'Charon', gender: 'Male', previewText: 'Hello, my name is Charon.' },
    { name: 'Fenrir', gender: 'Male', previewText: 'Hello, my name is Fenrir.' },
    { name: 'Zephyr', gender: 'Female', previewText: 'Hello, my name is Zephyr.' },
];

const App: React.FC = () => {
  const [text, setText] = useState<string>('Hello! This is a demonstration of text-to-speech using the Gemini API.');
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [rate, setRate] = useState<number>(100); // Percentage
  const [pitch, setPitch] = useState<number>(0); // Percentage offset
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null); // Holds the name of the voice being previewed
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      audioSourceRef.current?.stop();
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);
  
  const playAudio = async (base64Audio: string) => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const audioData = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);

    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    return source;
  };

  const handleStop = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
    }
    // onended will handle resetting state
  };

  const handlePreview = async (voice: Voice) => {
    if (isPreviewing) return; // Prevent multiple previews at once

    setIsPreviewing(voice.name);
    setError(null);

    try {
      const base64Audio = await generateSpeech(voice.previewText, voice.name);
      if (base64Audio) {
        const source = await playAudio(base64Audio);
        source.onended = () => {
          setIsPreviewing(null);
          if (audioSourceRef.current === source) {
            audioSourceRef.current = null;
          }
        };
        source.start();
        audioSourceRef.current = source;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during preview.");
      setIsPreviewing(null);
    }
  };

  const handleGenerateAndPlay = async () => {
    if (isPlaying) {
      handleStop();
      return;
    }
    
    if (!text.trim()) {
      setError("Please enter some text to generate speech.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const base64Audio = await generateSpeech(text, selectedVoice, rate, pitch);
      if (base64Audio) {
        const source = await playAudio(base64Audio);
        source.onended = () => {
          setIsPlaying(false);
          if (audioSourceRef.current === source) {
            audioSourceRef.current = null;
          }
        };
        source.start();
        audioSourceRef.current = source;
        setIsPlaying(true);
      } else {
        setError("Failed to generate audio. The response was empty.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-slate-800 rounded-lg shadow-xl p-8 space-y-6">
        <header className="text-center">
            <h1 className="text-4xl font-bold text-teal-400 flex items-center justify-center gap-3">
                <SoundWaveIcon />
                Simple text to speech
            </h1>
        </header>

        {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-md" role="alert">
                <p>{error}</p>
            </div>
        )}

        <div className="space-y-4">
            <label htmlFor="text-input" className="block text-sm font-medium text-slate-300">
                Enter Text
            </label>
            <textarea
                id="text-input"
                className="w-full h-40 p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste your text here..."
            />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-300">Choose a Voice</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {voices.map((voice) => (
              <div key={voice.name}>
                <button
                  onClick={() => setSelectedVoice(voice.name)}
                  className={`w-full text-left p-3 rounded-md border-2 transition-all ${
                    selectedVoice === voice.name
                      ? 'border-teal-500 bg-teal-500/20'
                      : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{voice.name}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${voice.gender === 'Female' ? 'bg-pink-500/50 text-pink-200' : 'bg-blue-500/50 text-blue-200'}`}>
                      {voice.gender}
                    </span>
                  </div>
                </button>
                <button 
                  onClick={() => handlePreview(voice)} 
                  disabled={!!isPreviewing}
                  className="w-full mt-2 text-xs flex items-center justify-center gap-1 text-slate-400 hover:text-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  aria-label={`Preview voice ${voice.name}`}
                >
                  {isPreviewing === voice.name ? <Spinner /> : <SoundWaveIcon />}
                  Preview
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
            <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-teal-400 hover:text-teal-300"
            >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </button>
            {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-700/50 rounded-md">
                    <div className="space-y-2">
                        <label htmlFor="rate-slider" className="block text-sm font-medium text-slate-300">
                            Rate: {rate}%
                        </label>
                        <input
                            id="rate-slider"
                            type="range"
                            min="50"
                            max="200"
                            value={rate}
                            onChange={(e) => setRate(Number(e.target.value))}
                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="pitch-slider" className="block text-sm font-medium text-slate-300">
                            Pitch: {pitch > 0 ? '+' : ''}{pitch}%
                        </label>
                        <input
                            id="pitch-slider"
                            type="range"
                            min="-20"
                            max="20"
                            step="1"
                            value={pitch}
                            onChange={(e) => setPitch(Number(e.target.value))}
                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                    </div>
                </div>
            )}
        </div>
        
        <div className="pt-4 flex justify-center">
            <button
                onClick={handleGenerateAndPlay}
                disabled={isLoading || !!isPreviewing}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-500 text-white font-bold rounded-full transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-500"
            >
                {isLoading ? (
                    <Spinner />
                ) : isPlaying ? (
                    <>
                        <StopIcon />
                        Stop
                    </>
                ) : (
                    <>
                        <PlayIcon />
                        Generate & Play
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default App;
