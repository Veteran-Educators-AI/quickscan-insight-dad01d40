import { useState, useEffect, useCallback } from 'react';

type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown' | 'unsupported';

interface CameraPermissionState {
  status: PermissionStatus;
  isChecking: boolean;
  hasCamera: boolean;
  error: string | null;
}

export function useCameraPermission() {
  const [state, setState] = useState<CameraPermissionState>({
    status: 'unknown',
    isChecking: true,
    hasCamera: true,
    error: null,
  });

  const checkPermission = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // First check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setState({
          status: 'unsupported',
          isChecking: false,
          hasCamera: false,
          error: 'Camera not supported on this device or browser.',
        });
        return 'unsupported';
      }

      // Check if we can query permissions (not available in all browsers)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          
          const updateFromPermission = (permState: PermissionState) => {
            setState({
              status: permState as PermissionStatus,
              isChecking: false,
              hasCamera: true,
              error: permState === 'denied' ? 'Camera access denied. Please enable it in your browser settings.' : null,
            });
          };

          updateFromPermission(result.state);

          // Listen for permission changes
          result.addEventListener('change', () => {
            updateFromPermission(result.state);
          });

          return result.state as PermissionStatus;
        } catch {
          // Permission query not supported for camera, fall through to enumeration
        }
      }

      // Fallback: Check if any video input devices exist
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(device => device.kind === 'videoinput');

      if (!hasVideoInput) {
        setState({
          status: 'unsupported',
          isChecking: false,
          hasCamera: false,
          error: 'No camera found on this device.',
        });
        return 'unsupported';
      }

      // We have a camera, but don't know permission status - it will prompt
      setState({
        status: 'prompt',
        isChecking: false,
        hasCamera: true,
        error: null,
      });
      return 'prompt';

    } catch (err) {
      console.error('Error checking camera permission:', err);
      setState({
        status: 'unknown',
        isChecking: false,
        hasCamera: true,
        error: null,
      });
      return 'unknown';
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // Actually request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      // Immediately stop the stream - we just wanted to check/request permission
      stream.getTracks().forEach(track => track.stop());

      setState({
        status: 'granted',
        isChecking: false,
        hasCamera: true,
        error: null,
      });
      return true;

    } catch (err) {
      console.error('Camera permission request failed:', err);
      
      let errorMessage = 'Unable to access camera.';
      let status: PermissionStatus = 'denied';

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please enable it in your browser settings.';
          status = 'denied';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
          status = 'unsupported';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is in use by another application.';
          status = 'denied';
        }
      }

      setState({
        status,
        isChecking: false,
        hasCamera: status !== 'unsupported',
        error: errorMessage,
      });
      return false;

    }
  }, []);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    ...state,
    checkPermission,
    requestPermission,
    canUseCamera: state.status === 'granted' || state.status === 'prompt' || state.status === 'unknown',
  };
}
