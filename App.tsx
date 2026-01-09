import React, { useState, useRef, useEffect } from 'react';
import { generateSpeech } from './services/geminiService';
import { decode, decodeAudioData, createWavBlob } from './utils/audio';
import Spinner from './components/Spinner';
import PlayIcon from './components/icons/PlayIcon';
import StopIcon from './components/icons/StopIcon';
import SoundWaveIcon from './components/icons/SoundWaveIcon';
import DownloadIcon from './components/icons/DownloadIcon';
import Visualizer from './components/Visualizer';

interface Voice {
  name: string;
  gender: 'Female' | 'Male';
  previewText: string;
  color: string;
}

const voices: Voice[] = [
    { name: 'Kore', gender: 'Female', previewText: 'Hi, I\'m Kore.', color: 'from-pink-500 to-rose-500' },
    { name: 'Puck', gender: 'Male', previewText: 'Hello, I\'m Puck.', color: 'from-blue-500 to-indigo-500' },
    { name: 'Charon', gender: 'Male', previewText: 'Greetings, I\'m Charon.', color: 'from-purple-500 to-violet-500' },
    { name: 'Fenrir', gender: 'Male', previewText: 'I am Fenrir.', color: 'from-amber-500 to-orange-500' },
    { name: 'Zephyr', gender: 'Female', previewText: 'I am Zephyr.', color: 'from-teal-500 to-emerald-500' },
];

const App: React.FC = () => {
  const [text, setText] = useState<string>('Welcome to VoxGen Studio. Transform your ideas into voice with our ultra-natural AI synthesis.');
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [rate, setRate] = useState<number>(100);
  const [pitch, setPitch] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [lastGeneratedAudio, setLastGeneratedAudio] = useState<string | null>(null);

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
    setIsPlaying(false);
  };

  const handleDownload = () => {
    if (!lastGeneratedAudio) return;
    
    try {
      const pcmData = decode(lastGeneratedAudio);
      const wavBlob = createWavBlob(pcmData, 24000);
      const url = URL.createObjectURL(wavBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `voxgen-${selectedVoice.toLowerCase()}-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Download failed. Please try generating the audio again.");
    }
  };

  const handlePreview = async (voice: Voice) => {
    if (isPreviewing) return;
    setIsPreviewing(voice.name);
    setError(null);

    try {
      const base64Audio = await generateSpeech(voice.previewText, voice.name);
      if (base64Audio) {
        const source = await playAudio(base64Audio);
        source.onended = () => {
          setIsPreviewing(null);
          if (audioSourceRef.current === source) audioSourceRef.current = null;
        };
        source.start();
        audioSourceRef.current = source;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed.");
      setIsPreviewing(null);
    }
  };

  const handleGenerateAndPlay = async () => {
    if (isPlaying) {
      handleStop();
      return;
    }
    
    if (!text.trim()) {
      setError("Please enter some text to synthesize.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const base64Audio = await generateSpeech(text, selectedVoice, rate, pitch);
      if (base64Audio) {
        setLastGeneratedAudio(base64Audio);
        const source = await playAudio(base64Audio);
        source.onended = () => {
          setIsPlaying(false);
          if (audioSourceRef.current === source) audioSourceRef.current = null;
        };
        source.start();
        audioSourceRef.current = source;
        setIsPlaying(true);
      } else {
        setError("Generation failed. No audio returned.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-12 transition-all duration-500">
      <div className="w-full max-w-4xl glass rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/5">
        
        {/* Left Sidebar: Settings & Voice Selection */}
        <div className="w-full md:w-80 bg-slate-900/50 p-8 border-b md:border-b-0 md:border-r border-white/5 space-y-8 flex flex-col">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Voice Library</h2>
            <div className="space-y-3 custom-scrollbar max-h-[40vh] md:max-h-none overflow-y-auto pr-2">
              {voices.map((voice) => (
                <button
                  key={voice.name}
                  onClick={() => setSelectedVoice(voice.name)}
                  className={`w-full group relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 ${
                    selectedVoice === voice.name
                      ? 'bg-white/10 shadow-lg'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${voice.color} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                    <span className="text-white font-bold text-sm">{voice.name[0]}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold text-sm ${selectedVoice === voice.name ? 'text-white' : 'text-slate-400'}`}>
                      {voice.name}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{voice.gender}</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handlePreview(voice); }} 
                    disabled={!!isPreviewing}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-white transition-all"
                  >
                    {isPreviewing === voice.name ? <Spinner /> : <SoundWaveIcon />}
                  </button>
                  {selectedVoice === voice.name && (
                    <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
            >
              <div className={`w-2 h-2 rounded-full transition-colors ${showAdvanced ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`} />
              Advanced Tuning
            </button>
            
            <div className={`transition-all duration-500 overflow-hidden ${showAdvanced ? 'max-h-64 mt-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Speed Rate</label>
                      <span className="text-xs font-mono text-indigo-400">{rate}%</span>
                    </div>
                    <input
                      type="range" min="50" max="200" value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tone Pitch</label>
                      <span className="text-xs font-mono text-indigo-400">{pitch}%</span>
                    </div>
                    <input
                      type="range" min="-20" max="20" step="1" value={pitch}
                      onChange={(e) => setPitch(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* Right Content: Text Input & Playback */}
        <div className="flex-1 p-8 md:p-12 flex flex-col relative bg-slate-900/30">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
                VoxGen Studio
              </h1>
              <p className="text-slate-500 text-sm mt-1 font-medium">Professional Speech Synthesis</p>
            </div>
            <div className="flex gap-2">
              <div className="h-2 w-2 rounded-full bg-slate-800" />
              <div className="h-2 w-2 rounded-full bg-slate-800" />
              <div className="h-2 w-2 rounded-full bg-indigo-500" />
            </div>
          </header>

          {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-3 animate-bounce">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              {error}
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-[300px]">
            <textarea
              className="w-full flex-1 bg-transparent border-none focus:ring-0 text-xl md:text-2xl font-light leading-relaxed placeholder:text-slate-700 resize-none custom-scrollbar outline-none text-slate-300"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What should I say today?"
            />
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col xl:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isPlaying ? 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'bg-slate-800'}`}>
                {isPlaying ? <Visualizer /> : <SoundWaveIcon className="text-slate-500" />}
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Voice</p>
                <p className="text-sm font-semibold text-slate-300">{selectedVoice}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full xl:w-auto">
              {lastGeneratedAudio && !isLoading && (
                <button
                  onClick={handleDownload}
                  title="Download HQ Audio"
                  className="flex items-center justify-center p-5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                >
                  <DownloadIcon />
                </button>
              )}
              
              <button
                onClick={handleGenerateAndPlay}
                disabled={isLoading}
                className={`flex-1 xl:flex-none relative group flex items-center justify-center gap-3 px-10 py-5 rounded-full font-bold transition-all duration-500 transform hover:scale-105 active:scale-95 shadow-2xl overflow-hidden ${
                  isPlaying 
                  ? 'bg-rose-500 text-white shadow-rose-500/20' 
                  : 'bg-white text-slate-900 hover:bg-slate-100 shadow-white/10'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <Spinner />
                    <span className="uppercase tracking-widest text-[10px]">Synthesizing...</span>
                  </div>
                ) : isPlaying ? (
                  <>
                    <StopIcon />
                    <span className="uppercase tracking-widest text-[10px]">Stop Playback</span>
                  </>
                ) : (
                  <>
                    <PlayIcon />
                    <span className="uppercase tracking-widest text-[10px]">Generate Audio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative Background Elements */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
};

export default App;