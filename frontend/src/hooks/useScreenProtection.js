import { useEffect } from 'react';

/**
 * Screen Protection Hook — Passive mode.
 * Screen capturing auto-logout has been disabled to prevent accidental session loss.
 */
const useScreenProtection = () => {
  useEffect(() => {
    // Screen capture auto-logout disabled to allow seamless screenshots and window switching
  }, []);
};

export default useScreenProtection;
