import React, { useEffect, useRef } from 'react';

// The main App component that encapsulates the animation
export default function TubesCursor() {
  // useRef to get a persistent reference to the canvas element
  const canvasRef = useRef(null);
  // useRef to hold the animation instance so we can call its methods
  const appRef = useRef(null);

  // This effect runs once when the component mounts
  useEffect(() => {
    // Delaying the initialization with setTimeout ensures the DOM is fully painted
    const initTimer = setTimeout(() => {
      import('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js')
        .then(module => {
          const TubesCursor = module.default;
          
          // Ensure the canvas element is still available before initializing
          if (canvasRef.current) {
            // Initialize the TubesCursor animation
            const app = TubesCursor(canvasRef.current, {
              tubes: {
                colors: ["#5e72e4", "#8965e0", "#f5365c"],
                lights: {
                  intensity: 200,
                  colors: ["#21d4fd", "#b721ff", "#f4d03f", "#11cdef"]
                }
              }
            });
            // Store the instance in our ref for later use
            appRef.current = app;
          }
        })
        .catch(err => console.error("Failed to load TubesCursor module:", err));
    }, 100); // 100ms delay to allow for DOM rendering

    // Cleanup function to dispose of the animation and clear the timeout
    return () => {
      clearTimeout(initTimer);
      // Check if app was initialized and has a dispose method before calling
      if (appRef.current && typeof appRef.current.dispose === 'function') {
        appRef.current.dispose();
      }
    };
  }, []); // The empty dependency array ensures this effect runs only once

  return (
    <div className="w-full h-screen relative">
      {/* Canvas element for the animation, positioned behind everything else */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />
    </div>
  );
}
