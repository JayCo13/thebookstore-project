import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Settings } from 'lucide-react';

const AudioSampleModal = ({ isOpen, onClose, audioUrl, bookTitle }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      // Stop audio when modal closes
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case ' ':
          event.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          skipBackward();
          break;
        case 'ArrowRight':
          skipForward();
          break;
        case 'ArrowUp':
          event.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          adjustVolume(-0.1);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying, volume]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  const adjustVolume = (delta) => {
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleProgressMouseDown = (e) => {
    setIsDragging(true);
    handleSeek(e);
  };

  const handleProgressMouseMove = (e) => {
    if (isDragging) {
      handleSeek(e);
    }
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleProgressMouseMove);
      document.addEventListener('mouseup', handleProgressMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleProgressMouseMove);
        document.removeEventListener('mouseup', handleProgressMouseUp);
      };
    }
  }, [isDragging]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setShowSettings(false);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume2;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  if (!isOpen || !audioUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="relative max-w-lg w-full mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-black">
          <div className="text-white">
            <h2 className="text-xl font-semibold">Nghe thử audio</h2>
            <p className="mt-2 text-md text-white/80">Sách: {bookTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio Player */}
        <div className="p-6 bg-gray-50">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-mono">{formatTime(currentTime)}</span>
              <span className="font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            <div
              className="relative w-full h-3 bg-gray-300 rounded-full cursor-pointer group"
              onMouseDown={handleProgressMouseDown}
            >
              {/* Background track */}
              <div className="absolute inset-0 bg-gray-300 rounded-full"></div>

              {/* Progress fill */}
              <div
                className="absolute top-0 left-0 h-full bg-black rounded-full transition-all duration-150"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              ></div>

              {/* Progress handle */}
              <div
                className="absolute top-1/2 transform -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#008080] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 10px)` }}
              ></div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-[#008080]/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={skipBackward}
              className="flex items-center justify-center w-10 h-10 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors"
              title="Skip back 10s"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlayPause}
              className="flex items-center justify-center w-16 h-16 bg-black hover:from-[#006666] hover:to-[#004d4d] text-white rounded-full transition-all transform hover:scale-105 shadow-lg"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>

            <button
              onClick={skipForward}
              className="flex items-center justify-center w-10 h-10 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors"
              title="Skip forward 10s"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Secondary Controls */}
          <div className="space-y-4">
            {/* Volume Control */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <VolumeIcon className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full audio-slider volume-slider"
                  style={{
                    '--volume': `${(isMuted ? 0 : volume) * 100}%`
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 font-mono w-8">
                {Math.round((isMuted ? 0 : volume) * 100)}
              </span>
            </div>

            {/* Speed Control */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Playback speed"
                >
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600 font-mono">{playbackRate}x</span>
                </button>

                {showSettings && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[120px]">
                    <div className="text-xs text-gray-500 mb-2 px-2">Playback Speed</div>
                    {playbackSpeeds.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handlePlaybackRateChange(speed)}
                        className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${playbackRate === speed
                          ? 'bg-black text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                          }`}
                      >
                        {speed}x {speed === 1 && '(Normal)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 text-xs text-gray-500 text-center space-y-1 flex justify-between">
            <div className='mt-1'>Spacebar: Phát/Pause</div>
            <div><span>← →: Bỏ qua 10s</span></div>
            <div><span>↑ ↓: Âm lượng</span></div>
            <div>ESC: Đóng</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioSampleModal;