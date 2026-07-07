import React, { useEffect, useRef } from 'react';

export default function TubesCursorComponent() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    let app = null;
    let animationFrameId = null;
    
    // 1. On sauvegarde l'API WebGPU d'origine
    const originalGpu = navigator.gpu;

    const initAnimation = async () => {
      if (canvasRef.current && !appRef.current) {
        try {
          /* 
            2. BLOCAGE STRICT : On supprime temporairement la propriété gpu de navigator.
               Three.js (et le script tubes1) va instantanément basculer sur WebGL2 (stable).
          */
          if (originalGpu) {
            Object.defineProperty(navigator, 'gpu', {
              configurable: true,
              enumerable: true,
              get: () => undefined // Renvoie undefined pour faire croire qu'il n'y a pas de WebGPU
            });
          }

          // 3. On charge le script APRÈS avoir bloqué l'API WebGPU
          const module = await import('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js');
          const TubesCursor = module.default;

          // 4. Initialisation sécurisée en WebGL2
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

          // 5. On restaure proprement l'API pour le reste du navigateur une fois l'init réussie
          if (originalGpu) {
            Object.defineProperty(navigator, 'gpu', {
              configurable: true,
              enumerable: true,
              get: () => originalGpu
            });
          }

        } catch (err) {
          console.error("Failed to initialize TubesCursor safely:", err);
        }
      }
    };

    // On attend que le canvas soit dessiné à l'écran
    animationFrameId = requestAnimationFrame(() => {
      initAnimation();
    });

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      
      // Sécurité : On remet toujours le WebGPU d'origine si le composant s'en va
      if (originalGpu) {
        Object.defineProperty(navigator, 'gpu', {
          configurable: true,
          enumerable: true,
          get: () => originalGpu
        });
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
