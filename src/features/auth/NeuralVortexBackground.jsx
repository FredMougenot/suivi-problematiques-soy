"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { SpotLight } from "@react-three/drei";

// --- Constantes graphiques (SVG Noise) ---
const METAL_NOISE = 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%221.5%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")';
const GRAIN_NOISE = 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22g%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23g)%22/%3E%3C/svg%3E")';
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

// --- Sous-composant : Le projecteur physique au plafond ---
const SpotlightFixture = ({ positionX, lightsOn }) => (
  <div
    style={{
      position: "absolute",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      left: `${positionX}%`,
      top: "3%",
      transform: "translate(-50%, -4px)",
    }}
  >
    {/* Base d'attache au plafond */}
    <div
      style={{
        width: "14px",
        height: "34px",
        borderRadius: "4px",
        border: "1px solid #18181b",
        boxShadow: "0 5px 10px rgba(0,0,0,0.9), inset 0 0 4px rgba(255,255,255,0.5)",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(to right, #666 0%, #ffffff 40%, #999 60%, #333 100%)",
      }}
    >
      <div style={{ position: "absolute", top: "4px", left: "50%", transform: "translateX(-50%)", width: "6px", height: "6px", backgroundColor: "#18181b", borderRadius: "50%", boxShadow: "inset 0 1px 1px rgba(0,0,0,1)" }} />
      <div style={{ position: "absolute", bottom: "4px", left: "50%", transform: "translateX(-50%)", width: "6px", height: "6px", backgroundColor: "#18181b", borderRadius: "50%", boxShadow: "inset 0 1px 1px rgba(0,0,0,1)" }} />
    </div>

    {/* Pivot de liaison */}
    <div 
      style={{ 
        width: "8px", 
        height: "18px", 
        background: "linear-gradient(to right, #18181b, #52525b, #09090b)", 
        borderLeft: "1px solid black", 
        borderRight: "1px solid black", 
        position: "relative" 
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "-8px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          border: "1px solid #18181b",
          boxShadow: "0 4px 8px rgba(0,0,0,1), inset 0 1px 2px rgba(255,255,255,0.3)",
          background: "radial-gradient(circle at top left, #777, #111)",
        }}
      />
    </div>

    {/* Corps de la lampe industrielle */}
    <div style={{ position: "relative", marginTop: "6px", width: "54px", height: "64px", display: "flex", justifyContent: "center", perspective: "120px" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderBottomLeftRadius: "1rem",
          borderBottomRightRadius: "1rem",
          borderTopLeftRadius: "2px",
          borderTopRightRadius: "2px",
          border: "1px solid black",
          boxShadow: "0 20px 30px rgba(0,0,0,0.9)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-evenly",
          background: "linear-gradient(to right, #111 0%, #3a3a3a 30%, #555 50%, #2a2a2a 80%, #000 100%)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, opacity: 0.35, mixBlendMode: "overlay", pointerEvents: "none", backgroundImage: METAL_NOISE }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ width: "100%", height: "2px", backgroundColor: "rgba(0,0,0,0.9)", boxShadow: "0 1px 0 rgba(255,255,255,0.15)", zIndex: 10 }} />
        ))}
      </div>

      {/* Lentille émettrice lumineuse */}
      <div
        style={{
          position: "absolute",
          bottom: "-6px",
          width: "58px",
          height: "18px",
          borderRadius: "50%",
          border: "2px solid #18181b",
          boxShadow: "0 10px 15px rgba(0,0,0,1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          overflow: "hidden",
          background: "radial-gradient(ellipse at center, #222, #000)",
        }}
      >
        <div
          style={{
            width: "34px",
            height: "10px",
            borderRadius: "50%",
            transition: "all 700ms",
            background: lightsOn ? "#ffffff" : "#111",
            boxShadow: lightsOn
              ? "0 0 20px 8px rgba(255,255,255,0.9), inset 0 0 8px #fff"
              : "inset 0 2px 5px rgba(0,0,0,0.9), inset 0 -1px 1px rgba(255,255,255,0.05)",
          }}
        />
      </div>

      {/* Volets géométriques */}
      <div
        style={{
          position: "absolute",
          bottom: "-18px",
          width: "46px",
          height: "20px",
          border: "1px solid black",
          boxShadow: "0 15px 15px rgba(0,0,0,0.8)",
          transformOrigin: "top",
          zIndex: 20,
          display: "flex",
          justifyContent: "center",
          transform: "rotateX(-45deg)",
          background: "linear-gradient(to bottom, #222, #050505)",
        }}
      >
        <div style={{ width: "80%", height: "100%", backgroundColor: "rgba(255,255,255,0.05)" }} />
      </div>
      <div
        style={{ position: "absolute", bottom: "6px", width: "46px", height: "20px", border: "1px solid black", transformOrigin: "bottom", zIndex: 0, transform: "rotateX(45deg)", background: "linear-gradient(to top, #111, #000)" }}
      />
      <div
        style={{ position: "absolute", bottom: "-6px", left: "-6px", width: "14px", height: "22px", backgroundColor: "#27272a", border: "1px solid black", transformOrigin: "right", zIndex: 10, boxShadow: "5px 0 10px rgba(0,0,0,0.5)", transform: "rotateY(-55deg) skewY(15deg)" }}
      />
      <div
        style={{ position: "absolute", bottom: "-6px", right: "-6px", width: "14px", height: "22px", backgroundColor: "#27272a", border: "1px solid black", transformOrigin: "left", zIndex: 10, boxShadow: "-5px 0 10px rgba(0,0,0,0.5)", transform: "rotateY(55deg) skewY(-15deg)" }}
      />
    </div>
  </div>
);

// --- Composant : Room (Structure Isométrique) ---
export function Room({
  backWall = { tl: [22, 10], tr: [78, 10], br: [78, 70], bl: [22, 70] },
  lightsOn = true,
  intensity = 1,
  lightColor = "230,240,255",
  spots = [35, 50, 65],
  vignette = 0.55,
  isFlickering = false,
  style = {},
}) {
  const { tl, tr, br, bl } = backWall;

  const poly = useMemo(
    () => (pts) => `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(", ")})`,
    []
  );

  return (
    <div 
      aria-hidden 
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        backgroundColor: "black",
        pointerEvents: "none",
        ...style
      }}
    >
      {/* 1. Murs de la pièce */}
      <div style={{ position: "absolute", inset: 0, clipPath: poly([tl, tr, br, bl]), background: "linear-gradient(to bottom, #141416 0%, #08080a 100%)" }} />
      <div style={{ position: "absolute", inset: 0, clipPath: poly([[0, 0], [100, 0], tr, tl]), background: "linear-gradient(to bottom, #000000 0%, rgba(0,0,0,0.85) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, clipPath: poly([[0, 0], tl, bl, [0, 100]]), background: "linear-gradient(to right, #08080a 0%, #121214 70%, #1a1a1c 100%)" }} />
      <div style={{ position: "absolute", inset: 0, clipPath: poly([[100, 0], tr, br, [100, 100]]), background: "linear-gradient(to left, #08080a 0%, #121214 70%, #1a1a1c 100%)" }} />
      <div style={{ position: "absolute", inset: 0, clipPath: poly([[0, 100], [100, 100], br, bl]), background: "linear-gradient(to top, #0f0f11 0%, #060608 100%)" }} />

      {/* 2. Lignes d'arêtes luminescentes */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 10 }}>
        <defs>
          <linearGradient id="baseGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="20%" stopColor="white" stopOpacity="0.5" />
            <stop offset="80%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.18" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={`${bl[0]}%`} y1={`${bl[1]}%`} x2={`${br[0]}%`} y2={`${br[1]}%`} stroke="rgba(255,255,255,0.2)" strokeWidth="5" style={{ filter: "blur(3px)" }} />
        <line x1={`${bl[0]}%`} y1={`${bl[1]}%`} x2={`${br[0]}%`} y2={`${br[1]}%`} stroke="url(#baseGrad)" strokeWidth="1" />
        <line x1={`${tl[0]}%`} y1={`${tl[1]}%`} x2={`${bl[0]}%`} y2={`${bl[1]}%`} stroke="url(#vGrad)" strokeWidth="1" />
        <line x1={`${tr[0]}%`} y1={`${tr[1]}%`} x2={`${br[0]}%`} y2={`${br[1]}%`} stroke="url(#vGrad)" strokeWidth="1" />
      </svg>

      {/* 3. Lumière Ambiante diffuse */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          mixBlendMode: "screen",
          willChange: "opacity",
          zIndex: 15,
          opacity: lightsOn ? intensity : 0,
          transition: isFlickering ? "none" : `opacity 700ms ${EASE}`,
        }}
      >
        <div style={{ position: "absolute", inset: 0, clipPath: poly([tl, tr, br, bl]), background: spots.map(x => `radial-gradient(ellipse 25% 40% at ${x}% 68%, rgba(${lightColor},0.15) 0%, transparent 70%)`).join(", ") }} />
        <div style={{ position: "absolute", inset: 0, clipPath: poly([[0, 0], tl, bl, [0, 100]]), background: `radial-gradient(ellipse 40% 50% at 15% 75%, rgba(${lightColor},0.08) 0%, transparent 60%)` }} />
        <div style={{ position: "absolute", inset: 0, clipPath: poly([[100, 0], tr, br, [100, 100]]), background: `radial-gradient(ellipse 40% 50% at 85% 75%, rgba(${lightColor},0.08) 0%, transparent 60%)` }} />
