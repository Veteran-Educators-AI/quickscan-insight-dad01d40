// Notification sound utility for hot folder alerts
// Uses Web Audio API for cross-browser compatibility

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Play a pleasant notification chime
export function playNotificationSound(type: 'success' | 'alert' = 'success') {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (needed due to autoplay policies)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'success') {
      // Pleasant two-tone chime (like a notification)
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } else {
      // Alert sound - slightly more attention-grabbing
      oscillator.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      oscillator.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.16); // D6
      
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    }
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
}

// Check if sound is enabled in settings
const SOUND_ENABLED_KEY = 'hot-folder-sound-enabled';

export function isSoundEnabled(): boolean {
  try {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  } catch {
    console.warn('Could not save sound preference');
  }
}
