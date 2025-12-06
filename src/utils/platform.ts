/**
 * Platform detection utilities
 */

export type Platform = 'desktop' | 'mobile';

/**
 * Detect if the current device is mobile based on touch capability and screen size
 */
export function detectPlatform(): Platform {
  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check screen size (mobile typically < 768px width)
  const isMobileSize = window.innerWidth < 768;
  
  // Check user agent as fallback
  const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  // Consider it mobile if screen is small enough, even without touch
  // This helps with responsive design testing and narrow desktop windows
  return (hasTouch && isMobileSize) || mobileUserAgent || isMobileSize ? 'mobile' : 'desktop';
}

/**
 * Check if device is currently in portrait orientation
 */
export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}

/**
 * Get responsive viewport dimensions based on platform
 */
export function getResponsiveViewportSize(): { width: number; height: number } {
  const platform = detectPlatform();
  const isPortraitMode = isPortrait();
  
  if (platform === 'mobile') {
    // Mobile viewport - scale down appropriately
    const maxWidth = Math.min(window.innerWidth - 20, 480);
    const maxHeight = isPortraitMode 
      ? Math.min(window.innerHeight * 0.4, 360)
      : Math.min(window.innerHeight * 0.6, 400);
    
    return { width: maxWidth, height: maxHeight };
  }
  
  // Desktop viewport
  return { width: 640, height: 480 };
}

/**
 * Get responsive canvas size for UI elements
 */
export function getResponsiveUISize(type: 'party' | 'minimap'): { width: number; height: number } {
  const platform = detectPlatform();
  
  if (platform === 'mobile') {
    if (type === 'party') {
      return { width: 280, height: 240 };
    }
    return { width: 140, height: 140 };
  }
  
  if (type === 'party') {
    return { width: 320, height: 320 };
  }
  return { width: 160, height: 160 };
}
