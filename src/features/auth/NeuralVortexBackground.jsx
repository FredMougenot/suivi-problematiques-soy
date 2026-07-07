import React, { useEffect, useRef } from 'react';
import TubesCursor from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js';

export default function TubesCursorComponent() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    let app = null;
    let animationFrameId = null;

    // SAUVEGARDE de la fonction originale de WebGPU pour pouvoir la restaurer au démontage
    const originalRequestAdapter = navigator.gpu?.requestAdapter;

    const initAnimation = () => {
      if (canvasRef.current && !appRef.current) {
        try {
          /* 
            FORCE WEBGL : On désactive temporairement l'accès à WebGPU.
            Three.js va automatiquement comprendre que WebGPU n'est pas disponible 
            et va basculer sur son moteur WebGL2 classique, réglant le crash du pilote.
          */
          if (navigator.gpu) {
            navigator.gpu.requestAdapter = () => Promise.resolve(null);
          }

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

          // Une fois initialisé, on peut restaurer proprement l'API globale du navigateur
          if (navigator.gpu && originalRequestAdapter) {
            navigator.gpu.requestAdapter = originalRequestAdapter;
          }

        } catch (err) {
          console.error("Failed to initialize TubesCursor:", err);
        }
      }
    };

    animationFrameId = requestAnimationFrame(initAnimation);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      
      // Sécurité pour restaurer le navigateur au démontage du composant
      if (navigator.gpu && originalRequestAdapter) {
        navigator.gpu.requestAdapter = originalRequestAdapter;
      }

      if (appRef.current && typeof appRef.current.dispose === 'function') {
        appRef.current.dispose();
        appRef.current = null;
      }
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-screen h-screen z-0 block bg-[#171717] pointer-events-none" 
    />
  );
}
