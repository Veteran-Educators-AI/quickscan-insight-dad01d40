// Camera feedback utilities for sound effects and haptic feedback

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a camera shutter sound effect using Web Audio API
 */
export function playCameraShutterSound() {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (needed due to autoplay policies)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const currentTime = ctx.currentTime;
    
    // Create white noise for the mechanical shutter sound
    const bufferSize = ctx.sampleRate * 0.08; // 80ms of noise
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    
    // Filter to shape the noise into a click sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;
    
    // Envelope for the click
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.5, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.06);
    
    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    whiteNoise.start(currentTime);
    whiteNoise.stop(currentTime + 0.08);
    
    // Add a subtle "click" tone
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    
    clickOsc.frequency.setValueAtTime(1200, currentTime);
    clickOsc.frequency.exponentialRampToValueAtTime(400, currentTime + 0.03);
    
    clickGain.gain.setValueAtTime(0.15, currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.04);
    
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    
    clickOsc.start(currentTime);
    clickOsc.stop(currentTime + 0.05);
    
  } catch (error) {
    console.warn('Could not play camera shutter sound:', error);
  }
}

/**
 * Trigger haptic feedback if available
 * Uses the Vibration API for web and falls back gracefully
 */
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium') {
  try {
    // Check for Vibration API support
    if ('vibrate' in navigator) {
      const patterns: Record<string, number | number[]> = {
        light: 10,
        medium: 25,
        heavy: [30, 10, 30],
      };
      
      navigator.vibrate(patterns[type]);
    }
    
    // For iOS Safari, we can try using the experimental Haptic API
    // This is available in some WebKit versions
    if ((window as any).webkit?.messageHandlers?.hapticFeedback) {
      (window as any).webkit.messageHandlers.hapticFeedback.postMessage({ type });
    }
    
  } catch (error) {
    // Haptic feedback not available - fail silently
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Combined camera capture feedback - plays sound and triggers haptic
 */
export function playCaptureEffect() {
  playCameraShutterSound();
  triggerHapticFeedback('medium');
}

// Settings for camera sound
const CAMERA_SOUND_KEY = 'camera-sound-enabled';

export function isCameraSoundEnabled(): boolean {
  try {
    const saved = localStorage.getItem(CAMERA_SOUND_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export function setCameraSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(CAMERA_SOUND_KEY, String(enabled));
  } catch {
    console.warn('Could not save camera sound preference');
  }
}

// Settings for haptic feedback
const HAPTIC_ENABLED_KEY = 'haptic-feedback-enabled';

export function isHapticEnabled(): boolean {
  try {
    const saved = localStorage.getItem(HAPTIC_ENABLED_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export function setHapticEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(HAPTIC_ENABLED_KEY, String(enabled));
  } catch {
    console.warn('Could not save haptic feedback preference');
  }
}

/**
 * Smart capture feedback that respects user preferences
 */
export function playSmartCaptureEffect() {
  if (isCameraSoundEnabled()) {
    playCameraShutterSound();
  }
  if (isHapticEnabled()) {
    triggerHapticFeedback('medium');
  }
}
