import React, { useEffect, useRef } from 'react';
import TubesCursor from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js';

export default function TubesCursorComponent() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    let app = null;
    let animationFrameId = null;

    const initAnimation = () => {
      if (canvasRef.current && !appRef.current) {
        try {
          app = new TubesCursor(canvasRef.current, {
            tubes: {
              colors: ["#5e72e4", "#8965e0", "#f5365c"],
              lights: {
                intensity: 200,
                colors: ["#21d4fd", "#b721ff", "#f4d03f", "#11cdef"]
              }
            }
          });
          appRef.current = app;
        } catch (err) {
          console.error("Failed to initialize TubesCursor:", err);
        }
      }
    };

    animationFrameId = requestAnimationFrame(initAnimation);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (appRef.current && typeof appRef.current.dispose === 'function') {
        appRef.current.dispose();
        appRef.current = null;
      }
    };
  }, []);

  return (
    /* 
      Le canvas est maintenant configuré en "fixed". 
      Il va se coller aux quatre coins de l'écran, en tâche de fond (z-0),
      sans pousser ni décaler les autres imports de ton fichier Login.jsx.
    */
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-screen h-screen z-0 block bg-[#171717] pointer-events-none" 
    />
  );
}
