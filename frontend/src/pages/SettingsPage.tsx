import React, { useState } from 'react';
import { Music, Plus, Check, Volume2, VolumeX, Volume1, Power, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMusicPlayer, INITIAL_TRACKS, Track } from '../hooks/useMusicPlayer';

function parseYouTubeVideoId(url: string): string | null {
  try {
    // Handle youtu.be short links
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];

    // Handle youtube.com/watch?v=
    const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (longMatch) return longMatch[1];

    // Handle youtube.com/embed/
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];

    // Handle raw 11-char video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();

    return null;
  } catch {
    return null;
  }
}

export default function SettingsPage() {
  const {
    trackIndex,
    volume,
    isEnabled,
    allTracks,
    customTracks,
    goToTrack,
    setVolume,
    nudgeVolume,
    setEnabled,
    addCustomTrack,
  } = useMusicPlayer();

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [customTrackName, setCustomTrackName] = useState('');
  const [urlError, setUrlError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  const handleAddTrack = () => {
    setUrlError('');
    setAddSuccess(false);

    if (!youtubeUrl.trim()) {
      setUrlError('Please enter a YouTube URL or video ID.');
      return;
    }

    const videoId = parseYouTubeVideoId(youtubeUrl.trim());
    if (!videoId) {
      setUrlError('Invalid YouTube URL. Please paste a valid YouTube link or 11-character video ID.');
      return;
    }

    const name = customTrackName.trim() || `Custom Track ${customTracks.length + 1}`;
    const newTrack: Track = { name, videoId, artist: 'Custom' };
    addCustomTrack(newTrack);
    setYoutubeUrl('');
    setCustomTrackName('');
    setAddSuccess(true);
    setTimeout(() => setAddSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Manage your account preferences and background music.
        </p>
      </div>

      {/* Background Music Section */}
      <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-card-shadow">
        {/* Section header */}
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground font-display">Background Music</h2>
            <p className="text-xs text-muted-foreground">
              Choose a Sonic track or add your own YouTube link
            </p>
          </div>
          {/* Power toggle */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{isEnabled ? 'On' : 'Off'}</span>
            <button
              onClick={() => setEnabled(!isEnabled)}
              className={`p-2 rounded-xl transition-colors ${
                isEnabled
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
              title={isEnabled ? 'Turn off music' : 'Turn on music'}
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Volume control */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Volume</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => nudgeVolume(-5)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Volume down (-5)"
              >
                <VolumeX className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <Slider
                  value={[volume]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([val]) => setVolume(val)}
                />
              </div>
              <button
                onClick={() => nudgeVolume(5)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Volume up (+5)"
              >
                <VolumeIcon className="w-4 h-4" />
              </button>
              <span className="text-sm font-mono text-foreground w-10 text-right">
                {volume === 0 ? 'Mute' : `${volume}%`}
              </span>
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground px-0.5">
              <span>0 (Muted)</span>
              <span>100 (Loud)</span>
            </div>
          </div>

          <Separator />

          {/* Track list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Track Rotation</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Use arrows in player to switch</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              {allTracks.map((track, idx) => {
                const isActive = idx === trackIndex;
                const isCustom = idx >= INITIAL_TRACKS.length;
                return (
                  <div
                    key={`${track.videoId}-${idx}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-background hover:bg-muted/50 hover:border-border/80'
                    }`}
                    onClick={() => goToTrack(idx)}
                  >
                    {/* Track number / active indicator */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isActive ? '♪' : idx + 1}
                    </div>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isActive ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {track.name}
                      </p>
                      {track.artist && (
                        <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCustom && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          Custom
                        </Badge>
                      )}
                      {isActive && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground">
                          <Check className="w-2.5 h-2.5 mr-0.5" />
                          Active
                        </Badge>
                      )}
                      {!isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToTrack(idx);
                          }}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Import custom YouTube track */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Import a Track</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Paste a YouTube URL or video ID to add it to your rotation.
            </p>

            <div className="space-y-2">
              <Input
                placeholder="Track name (optional)"
                value={customTrackName}
                onChange={(e) => setCustomTrackName(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="https://youtube.com/watch?v=... or video ID"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    if (urlError) setUrlError('');
                  }}
                  className={`text-sm flex-1 ${urlError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTrack();
                  }}
                />
                <Button onClick={handleAddTrack} className="shrink-0 gap-1.5">
                  <Plus className="w-4 h-4" />
                  Add Track
                </Button>
              </div>

              {urlError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <span>⚠</span> {urlError}
                </p>
              )}
              {addSuccess && (
                <p className="text-xs text-positive-custom flex items-center gap-1">
                  <Check className="w-3 h-3" /> Track added successfully!
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
