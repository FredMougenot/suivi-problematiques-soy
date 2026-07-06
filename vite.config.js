import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Base path pour GitHub Pages : ce repo est servi sous
// https://fredmougenot.github.io/suivi-problematiques-soy/ (pas un repo
// username.github.io racine), donc le base path est nécessaire.
// À corriger si l'hébergement réel diffère.
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['styled-jsx/babel'],
      },
    }),
  ],
  base: '/suivi-problematiques-soy/',
})
