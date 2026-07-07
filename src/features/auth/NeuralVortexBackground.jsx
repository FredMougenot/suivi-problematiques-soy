import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Petit utilitaire inline pour combiner les classes Tailwind si tu n'as pas de @ /lib/utils
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Générateur de couleurs aléatoires sans typage
const randomColors = (count) => {
  return new Array(count)
    .fill(0)
    .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
};

export function TubesBackground({ 
  children, 
  className,
  enableClickInteraction = true 
}) {
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const tubesRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let cleanup;

    const initTubes = async () => {
      if (!canvasRef.current) return;

      try {
        // Chargement dynamique depuis le CDN (compatible ES Modules / Vite)
        const module = await import('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js');
        const TubesCursor = module.default;

        if (!mounted) return;

        const app = TubesCursor(canvasRef.current, {
          tubes: {
            colors: ["#f967fb", "#53bc28", "#6958d5"],
            lights: {
              intensity: 200,
              colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"]
            }
          }
        });

        tubesRef.current = app;
        setIsLoaded(true);

        cleanup = () => {
          // Fonction de nettoyage si nécessaire
        };

      } catch (error) {
        console.error("Failed to load TubesCursor:", error);
      }
    };

    initTubes();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  const handleClick = () => {
    if (!enableClickInteraction || !tubesRef.current) return;
    
    const colors = randomColors(3);
    const lightsColors = randomColors(4);
    
    // Met à jour l'effet Three.js avec les nouvelles couleurs
    tubesRef.current.tubes.setColors(colors);
    tubesRef.current.tubes.setLightsColors(lightsColors);
  };

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        zIndex: 0,
        transform: 'translateZ(0)',
      }}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
        }}
      />

      {/* Superposition du contenu */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {children}
      </div>
    </div>
  );
}

export default TubesBackground;
