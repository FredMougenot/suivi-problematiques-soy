import React, { useEffect, useRef } from 'react';

export default function TubesCursorComponent() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    let app = null;
    let animationFrameId = null;
    
    // On conserve une référence vers le constructeur global original si Three est exposé
    const originalWebGPURenderer = window.THREE?.WebGPURenderer;

    const initAnimation = async () => {
      if (canvasRef.current && !appRef.current) {
        try {
          /* 
            INTERCEPTION STRICTE :
            On redéfinit la manière dont Three.js gère son WebGPURenderer global.
            Dès que le script externe appelle "new WebGPURenderer()", on lui injecte 
            de force le paramètre de repli WebGL de Three.js.
          */
          if (window.THREE) {
            const OriginalRenderer = window.THREE.WebGPURenderer;
            window.THREE.WebGPURenderer = function (parameters) {
              return new OriginalRenderer({
                ...parameters,
                forceWebGL: true // Force Three.js à utiliser le backend WebGL2 classique
              });
            };
            // On copie les propriétés statiques s'il y en a
            Object.assign(window.THREE.WebGPURenderer, OriginalRenderer);
          }

          // Chargement dynamique sécurisé du module de curseur
          const module = await import('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js');
          const TubesCursor = module.default;

          // Initialisation du curseur
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
          console.error("Failed to initialize TubesCursor safely:", err);
          
          // Solution de secours ultime : Si l'interception échoue, on neutralise l'API GPU
          try {
            if (navigator.gpu) {
              Object.defineProperty(navigator, 'gpu', {
                configurable: true,
                get: () => undefined
              });
            }
            const module = await import('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js');
            app = new module.default(canvasRef.current);
            appRef.current = app;
          } catch (fallbackErr) {
            console.error("Ultimate fallback failed:", fallbackErr);
          }
        }
      }
    };

    animationFrameId = requestAnimationFrame(() => {
      initAnimation();
    });

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      
      // Nettoyage et restauration de l'objet global THREE
      if (window.THREE && originalWebGPURenderer) {
        window.THREE.WebGPURenderer = originalWebGPURenderer;
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
