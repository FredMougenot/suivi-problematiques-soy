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
          boxShadow: "0 4px 8px rgba(0,0,0,1), inset 0 1px 2px rgba(255,2"use client";

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
          boxShadow: "0 4px 8px rgba(0,0,0,1), inset 0 1px 2px rgba(255,2
