/**
 * Utility functions to detect iOS devices
 */

/**
 * Detects if the current device is running iOS
 * This checks for both iOS and iPadOS
 * @returns {boolean} true if the device is running iOS or iPadOS
 */
export const isIOS = () => {
  // Check for iOS devices
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  // Additional check for iPad with desktop mode
  const isiPadOS = navigator.platform === 'MacIntel' && 
                   navigator.maxTouchPoints > 1 &&
                   !window.MSStream;
  
  return isiOS || isiPadOS;
};

/**
 * Detects if the current browser is Safari (including iOS WebView/Chrome on iOS)
 * @returns {boolean} true if browser is Safari or WebKit-based on iOS
 */
export const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  // Safari or WebKit-based browsers on iOS all use the same WebKit engine
  return ua.indexOf('safari') > -1 || 
         (isIOS() && (ua.indexOf('crios') > -1 || ua.indexOf('fxios') > -1));
};

/**
 * Checks if audio autoplay is likely to be restricted
 * @returns {boolean} true if audio autoplay is likely restricted
 */
export const hasAudioRestrictions = () => {
  return isIOS() || isSafari();
};