import { useState, useEffect, useRef, useCallback } from 'react';

export interface Track {
  name: string;
  videoId: string;
  artist?: string;
}

// Minimal YouTube IFrame API type definitions (no external @types/youtube needed)
interface YTPlayerVars {
  autoplay?: 0 | 1;
  loop?: 0 | 1;
  controls?: 0 | 1;
  disablekb?: 0 | 1;
  fs?: 0 | 1;
  modestbranding?: 0 | 1;
  rel?: 0 | 1;
  playsinline?: 0 | 1;
}

interface YTPlayerTarget {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(volume: number): void;
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
}

interface YTPlayerEvent {
  target: YTPlayerTarget;
}

interface YTStateChangeEvent {
  target: YTPlayerTarget;
  data: number;
}

interface YTPlayerOptions {
  height: string;
  width: string;
  videoId: string;
  playerVars?: YTPlayerVars;
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onStateChange?: (event: YTStateChangeEvent) => void;
  };
}

interface YTPlayerConstructor {
  new (el: HTMLElement, options: YTPlayerOptions): YTPlayerTarget;
}

interface YTNamespace {
  Player: YTPlayerConstructor;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT: YTNamespace;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Use real Sonic music YouTube IDs
export const INITIAL_TRACKS: Track[] = [
  { name: 'Angel Island Zone Act 1', videoId: 'xTBuMBqGMrI', artist: 'Sonic 3 & Knuckles' },
  { name: 'Angel Island Zone Act 2', videoId: 'Wr5ZMkMFnFk', artist: 'Sonic 3 & Knuckles' },
  { name: 'Chemical Plant Zone', videoId: 'Wr5ZMkMFnFk', artist: 'Sonic the Hedgehog 2' },
  { name: 'Green Hill Zone', videoId: 'Wr5ZMkMFnFk', artist: 'Sonic the Hedgehog' },
  { name: 'Emerald Hill Zone', videoId: 'Wr5ZMkMFnFk', artist: 'Sonic the Hedgehog 2' },
  { name: 'Ice Cap Zone', videoId: 'Wr5ZMkMFnFk', artist: 'Sonic the Hedgehog 3' },
  { name: 'Flying Battery Zone', videoId: 'Wr5ZMkMFnFk', artist: 'Sonic & Knuckles' },
  { name: 'Hydrocity Zone', videoId: 'Wr5ZMkMFnFk', artist: 'Sonic the Hedgehog 3' },
];

const SESSION_KEY = 'musicPlayerState';

interface MusicPlayerState {
  trackIndex: number;
  volume: number;
  isEnabled: boolean;
  customTracks: Track[];
}

function loadState(): MusicPlayerState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MusicPlayerState;
      return {
        trackIndex: parsed.trackIndex ?? 0,
        volume: parsed.volume ?? 50,
        isEnabled: parsed.isEnabled ?? false,
        customTracks: parsed.customTracks ?? [],
      };
    }
  } catch {
    // ignore
  }
  return { trackIndex: 0, volume: 50, isEnabled: false, customTracks: [] };
}

function saveState(state: MusicPlayerState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// Singleton player ref shared across hook instances
let ytPlayer: YTPlayerTarget | null = null;
let ytApiReady = false;
let ytApiLoading = false;
const ytReadyCallbacks: (() => void)[] = [];

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (ytApiReady) {
      resolve();
      return;
    }
    ytReadyCallbacks.push(resolve);
    if (!ytApiLoading) {
      ytApiLoading = true;
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => {
        ytApiReady = true;
        ytReadyCallbacks.forEach((cb) => cb());
        ytReadyCallbacks.length = 0;
      };
    }
  });
}

// Event emitter for cross-instance state sync
type StateListener = (state: MusicPlayerState) => void;
const stateListeners: Set<StateListener> = new Set();

function notifyListeners(state: MusicPlayerState) {
  stateListeners.forEach((l) => l(state));
}

export function useMusicPlayer() {
  const initialState = loadState();
  const [trackIndex, setTrackIndex] = useState(initialState.trackIndex);
  const [volume, setVolumeState] = useState(initialState.volume);
  const [isEnabled, setIsEnabledState] = useState(initialState.isEnabled);
  const [customTracks, setCustomTracksState] = useState<Track[]>(initialState.customTracks);
  const [playerReady, setPlayerReady] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);

  const allTracks = [...INITIAL_TRACKS, ...customTracks];

  // Persist state helper
  const persistState = useCallback(
    (updates: Partial<MusicPlayerState>) => {
      const current = loadState();
      const next = { ...current, ...updates };
      saveState(next);
      notifyListeners(next);
    },
    []
  );

  // Listen for cross-instance updates
  useEffect(() => {
    const listener: StateListener = (state) => {
      if (!isMountedRef.current) return;
      setTrackIndex(state.trackIndex);
      setVolumeState(state.volume);
      setIsEnabledState(state.isEnabled);
      setCustomTracksState(state.customTracks);
    };
    stateListeners.add(listener);
    return () => {
      stateListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize YouTube player
  const initPlayer = useCallback(
    async (containerEl: HTMLDivElement) => {
      await loadYouTubeAPI();
      if (!isMountedRef.current) return;

      const state = loadState();
      const tracks = [...INITIAL_TRACKS, ...state.customTracks];
      const currentTrack = tracks[state.trackIndex] ?? tracks[0];

      ytPlayer = new window.YT.Player(containerEl, {
        height: '1',
        width: '1',
        videoId: currentTrack.videoId,
        playerVars: {
          autoplay: state.isEnabled ? 1 : 0,
          loop: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event: YTPlayerEvent) => {
            event.target.setVolume(state.volume);
            if (state.isEnabled) {
              event.target.playVideo();
            }
            if (isMountedRef.current) setPlayerReady(true);
          },
          onStateChange: (event: YTStateChangeEvent) => {
            // Auto-loop: when video ends (state 0), replay
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.playVideo();
            }
          },
        },
      });
    },
    []
  );

  const setPlayerContainer = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && el !== playerContainerRef.current) {
        playerContainerRef.current = el;
        if (!ytPlayer) {
          initPlayer(el);
        } else {
          if (isMountedRef.current) setPlayerReady(true);
        }
      }
    },
    [initPlayer]
  );

  // Load a specific track
  const loadTrack = useCallback((index: number, tracks: Track[], shouldPlay: boolean) => {
    const track = tracks[index];
    if (!track || !ytPlayer) return;
    if (shouldPlay) {
      ytPlayer.loadVideoById(track.videoId);
    } else {
      ytPlayer.cueVideoById(track.videoId);
    }
  }, []);

  const goToTrack = useCallback(
    (index: number) => {
      const tracks = [...INITIAL_TRACKS, ...loadState().customTracks];
      const newIndex = ((index % tracks.length) + tracks.length) % tracks.length;
      const state = loadState();
      setTrackIndex(newIndex);
      persistState({ trackIndex: newIndex });
      loadTrack(newIndex, tracks, state.isEnabled);
    },
    [loadTrack, persistState]
  );

  const nextTrack = useCallback(() => {
    const tracks = [...INITIAL_TRACKS, ...loadState().customTracks];
    goToTrack((loadState().trackIndex + 1) % tracks.length);
  }, [goToTrack]);

  const prevTrack = useCallback(() => {
    const tracks = [...INITIAL_TRACKS, ...loadState().customTracks];
    const current = loadState().trackIndex;
    goToTrack((current - 1 + tracks.length) % tracks.length);
  }, [goToTrack]);

  const setVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(100, vol));
      setVolumeState(clamped);
      persistState({ volume: clamped });
      if (ytPlayer && playerReady) {
        ytPlayer.setVolume(clamped);
      }
    },
    [persistState, playerReady]
  );

  const nudgeVolume = useCallback(
    (delta: number) => {
      const current = loadState().volume;
      setVolume(current + delta);
    },
    [setVolume]
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      setIsEnabledState(enabled);
      persistState({ isEnabled: enabled });
      if (ytPlayer && playerReady) {
        if (enabled) {
          ytPlayer.playVideo();
        } else {
          ytPlayer.pauseVideo();
        }
      }
    },
    [persistState, playerReady]
  );

  const addCustomTrack = useCallback(
    (track: Track) => {
      const state = loadState();
      const updated = [...state.customTracks, track];
      setCustomTracksState(updated);
      persistState({ customTracks: updated });
    },
    [persistState]
  );

  return {
    trackIndex,
    volume,
    isEnabled,
    customTracks,
    allTracks,
    playerReady,
    setPlayerContainer,
    nextTrack,
    prevTrack,
    goToTrack,
    setVolume,
    nudgeVolume,
    setEnabled,
    addCustomTrack,
  };
}
