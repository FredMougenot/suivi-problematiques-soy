import React, { useEffect, useRef } from 'react';

export default function TubesCursor() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);

  const randomColors = (count) => {
    return new Array(count)
      .fill(0)
      .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
  };

  useEffect(() => {
    let appInstance = null;
    let isInitialized = false;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;

        // On attend que le canvas possède des dimensions réelles injectées par le CSS
        if (width > 50 && height > 50 && !isInitialized) {
          isInitialized = true;

          import('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js')
            .then(module => {
              const TubesCursor = module.default;
              
              if (canvasRef.current) {
                appInstance = TubesCursor(canvasRef.current, {
                  tubes: {
                    colors: ["#8b5cf6", "#ec4899", "#22d3ee"],
                    lights: {
                      intensity: 200,
                      colors: ["#21d4fd", "#b721ff", "#f4d03f", "#11cdef"]
                    }
                  }
                });
                appRef.current = appInstance;

                // FIX CRUCIAL POUR LES ERREURS NaN & TEXTURE 0x0 :
                // On déclenche manuellement un événement de redimensionnement global.
                // Cela force en interne le moteur Three.js de la librairie à recalculer ses matrices 
                // de projection et à recréer sa texture WebGL/WebGPU aux bonnes dimensions.
                window.dispatchEvent(new Event('resize'));
              }
            })
            .catch(err => console.error("Failed to load TubesCursor module:", err));
        }
      }
    });

    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }

    return () => {
      observer.disconnect();
      if (appInstance && typeof appInstance.dispose === 'function') {
        appInstance.dispose();
      }
    };
  }, []);

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
      <canvas ref={canvasRef} className="lg-canvas" />
    </div>
  );
}
