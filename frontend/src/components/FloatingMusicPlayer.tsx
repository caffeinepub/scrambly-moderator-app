import React, { useRef, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Volume1,
  Music,
  Power,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

export default function FloatingMusicPlayer() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const {
    trackIndex,
    volume,
    isEnabled,
    allTracks,
    setPlayerContainer,
    nextTrack,
    prevTrack,
    setVolume,
    nudgeVolume,
    setEnabled,
  } = useMusicPlayer();

  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setPlayerContainer(containerRef.current);
    }
  }, [setPlayerContainer]);

  if (!isAuthenticated) return null;

  const currentTrack = allTracks[trackIndex];

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1"
      style={{ maxWidth: '280px' }}
    >
      {/* Hidden YouTube player container */}
      <div
        ref={containerRef}
        style={{ width: 1, height: 1, overflow: 'hidden', position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />

      {/* Player card */}
      <div className="bg-card border border-border rounded-2xl shadow-card-shadow overflow-hidden w-64">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary font-display tracking-wide">
              Music
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Power toggle */}
            <button
              onClick={() => setEnabled(!isEnabled)}
              className={`p-1 rounded-md transition-colors ${
                isEnabled
                  ? 'text-primary bg-primary/20 hover:bg-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title={isEnabled ? 'Turn off music' : 'Turn on music'}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="px-3 py-2.5 space-y-2.5">
            {/* Track name */}
            <div className="text-center">
              <p
                className={`text-xs font-semibold truncate ${
                  isEnabled ? 'text-foreground' : 'text-muted-foreground'
                }`}
                title={currentTrack?.name}
              >
                {currentTrack?.name ?? 'No track'}
              </p>
              {currentTrack?.artist && (
                <p className="text-[10px] text-muted-foreground truncate">{currentTrack.artist}</p>
              )}
            </div>

            {/* Track navigation */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={prevTrack}
                title="Previous track"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="font-mono">{trackIndex + 1}</span>
                <span>/</span>
                <span className="font-mono">{allTracks.length}</span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={nextTrack}
                title="Next track"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => nudgeVolume(-5)}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Volume down"
              >
                <VolumeX className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1">
                <Slider
                  value={[volume]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([val]) => setVolume(val)}
                  className="w-full"
                />
              </div>

              <button
                onClick={() => nudgeVolume(5)}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Volume up"
              >
                <VolumeIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume label */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">
                {volume === 0 ? 'Muted' : `Volume: ${volume}%`}
              </span>
              <span
                className={`text-[10px] font-medium ${
                  isEnabled ? 'text-positive-custom' : 'text-muted-foreground'
                }`}
              >
                {isEnabled ? '▶ Playing' : '⏸ Paused'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
