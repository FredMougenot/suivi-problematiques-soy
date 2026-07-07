import React, { useEffect, useRef } from 'react';

// The main App component that encapsulates the animation
export default function TubesCursor() {
  // useRef to get a persistent reference to the canvas element
  const canvasRef = useRef(null);
  // useRef to hold the animation instance so we can call its methods
  const appRef = useRef(null);

  /**
   * Generates an array of random hex color strings.
   * @param {number} count - The number of random colors to generate.
   * @returns {string[]} An array of color strings.
   */
  const randomColors = (count) => {
    return new Array(count)
      .fill(0)
      .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
  };

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


  // Handles click events on the main container
  const handleClick = () => {
    if (appRef.current) {
      // On décale l'exécution à la micro-tâche suivante grâce au setTimeout(..., 0)
      // Cela évite de casser les calculs mathématiques internes de la géométrie de Three.js
      setTimeout(() => {
        const newTubeColors = randomColors(3);
        const newLightColors = randomColors(4);
        
        // Update the colors in the running animation safely
        if (appRef.current.tubes) {
          appRef.current.tubes.setColors(newTubeColors);
          appRef.current.tubes.setLightsColors(newLightColors);
        }
      }, 0);
    }
  };

  return (
    // La div est proprement ouverte et liée au clic
    <div onClick={handleClick} className="w-full h-screen relative cursor-pointer">
      {/* Canvas element for the animation, positioned behind everything else */}
      <canvas ref={canvasRef} className="lg-canvas" />
    </div>
  );
}
