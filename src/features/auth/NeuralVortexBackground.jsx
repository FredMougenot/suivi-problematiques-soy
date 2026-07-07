import React, { useEffect, useRef } from 'react';
// Importation directe et propre du module externe en tête de fichier
import TubesCursor from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js';

// The main App component that encapsulates the animation
export default function TubesCursorComponent() {
  // useRef to get a persistent reference to the canvas element
  const canvasRef = useRef(null);
  // useRef to hold the animation instance so we can call its methods
  const appRef = useRef(null);

  // This effect runs once when the component mounts
  useEffect(() => {
    let app = null;
    let animationFrameId = null;

    // Utilisation de requestAnimationFrame pour garantir que le DOM est totalement
    // rendu en pixels (évite l'erreur WebGPU width:0 / height:0)
    const initAnimation = () => {
      if (canvasRef.current && !appRef.current) {
        try {
          // Initialize the TubesCursor animation
          app = new TubesCursor(canvasRef.current, {
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
        } catch (err) {
          console.error("Failed to initialize TubesCursor:", err);
        }
      }
    };

    // On planifie l'initialisation juste après le rendu graphique du navigateur
    animationFrameId = requestAnimationFrame(initAnimation);

    // Cleanup function to dispose of the animation and clear loops
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      // Check if app was initialized and has a dispose method before calling
      if (appRef.current && typeof appRef.current.dispose === 'function') {
        appRef.current.dispose();
        appRef.current = null;
      }
    };
  }, []); // The empty dependency array ensures this effect runs only once

  return (
    <div className="w-full h-screen relative bg-[#171717] overflow-hidden">
      {/* Canvas element for the animation, positioned behind everything else */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 block" />
    </div>
  );
}
