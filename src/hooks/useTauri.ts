import { useEffect, useState, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Hook for window controls
 */
export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const window = getCurrentWindow();

    const checkMaximized = async () => {
      const maximized = await window.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    // Listen for resize events
    const unlisten = window.onResized(() => {
      checkMaximized();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const minimize = useCallback(async () => {
    await getCurrentWindow().minimize();
  }, []);

  const toggleMaximize = useCallback(async () => {
    const window = getCurrentWindow();
    if (isMaximized) {
      await window.unmaximize();
    } else {
      await window.maximize();
    }
    setIsMaximized(!isMaximized);
  }, [isMaximized]);

  const close = useCallback(async () => {
    await getCurrentWindow().close();
  }, []);

  return {
    isMaximized,
    minimize,
    toggleMaximize,
    close,
  };
}

/**
 * Hook for detecting platform
 */
export function usePlatform() {
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'linux' | 'unknown'>('unknown');

  useEffect(() => {
    // Detect platform from navigator
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) {
      setPlatform('windows');
    } else if (userAgent.includes('mac')) {
      setPlatform('macos');
    } else if (userAgent.includes('linux')) {
      setPlatform('linux');
    }
  }, []);

  return platform;
}

/**
 * Hook for keyboard shortcut recording
 */
export function useShortcutRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [shortcut, setShortcut] = useState<string>('');

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setShortcut('');
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const clearShortcut = useCallback(() => {
    setShortcut('');
  }, []);

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const parts: string[] = [];

      // Modifiers
      if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      // Key
      let key = e.key;

      // Normalize key names
      if (key === ' ') key = 'Space';
      else if (key === 'ArrowUp') key = 'Up';
      else if (key === 'ArrowDown') key = 'Down';
      else if (key === 'ArrowLeft') key = 'Left';
      else if (key === 'ArrowRight') key = 'Right';
      else if (key.length === 1) key = key.toUpperCase();

      // Skip modifier-only presses
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        return;
      }

      parts.push(key);

      const shortcutStr = parts.join('+');
      setShortcut(shortcutStr);
      setIsRecording(false);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording]);

  return {
    isRecording,
    shortcut,
    startRecording,
    stopRecording,
    clearShortcut,
    setShortcut,
  };
}

