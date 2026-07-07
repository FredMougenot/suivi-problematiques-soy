import React, { useEffect, useRef } from 'react';

// Le composant principal de l'animation d'arrière-plan
export default function TubesCursor() {
  // Référence pour cibler le canvas HTML
  const canvasRef = useRef(null);
  // Référence pour stocker l'instance de l'animation Three.js
  const appRef = useRef(null);

  /**
   * Génère un tableau de chaînes de caractères de couleurs hexadécimales aléatoires.
   * @param {number} count - Le nombre de couleurs à générer.
   * @returns {string[]} Un tableau de couleurs.
   */
  const randomColors = (count) => {
    return new Array(count)
      .fill(0)
      .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
  };

  // Cet effet s'exécute au montage du composant
  useEffect(() => {
    let appInstance = null;
    let isInitialized = false;

    // Utilisation d'un ResizeObserver pour s'assurer que le canvas a bien été rendu
    // avec des dimensions valides (> 10px) avant de lancer les calculs 3D (évite le bug du NaN)
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;

        if (width > 10 && height > 10 && !isInitialized) {
          isInitialized = true;

          import('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js')
            .then(module => {
              const TubesCursor = module.default;
              
              if (canvasRef.current) {
                // Initialisation de l'animation avec les couleurs de ta page login
                appInstance = TubesCursor(canvasRef.current, {
                  tubes: {
                    colors: ["#8b5cf6", "#ec4899", "#22d3ee"], // Correspond aux variables CSS de la page de login
                    lights: {
                      intensity: 200,
                      colors: ["#21d4fd", "#b721ff", "#f4d03f", "#11cdef"]
                    }
                  }
                });
                appRef.current = appInstance;
              }
            })
            .catch(err => console.error("Failed to load TubesCursor module:", err));
        }
      }
    });

    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }

    // Nettoyage de l'observateur et destruction de l'instance de l'animation
    return () => {
      observer.disconnect();
      if (appInstance && typeof appInstance.dispose === 'function') {
        appInstance.dispose();
      }
    };
  }, []);

  // Change les couleurs aléatoirement au clic
  const handleClick = () => {
    if (appRef.current) {
      const newTubeColors = randomColors(3);
      const newLightColors = randomColors(4);
      
      appRef.current.tubes.setColors(newTubeColors);
      appRef.current.tubes.setLightsColors(newLightColors);
    }
  };

  return (
    <div onClick={handleClick} style={{ display: 'contents' }}>
      {/* Canvas lié à la classe CSS .lg-canvas de ton login.css */}
      <canvas ref={canvasRef} className="lg-canvas" />
    </div>
  );
}
