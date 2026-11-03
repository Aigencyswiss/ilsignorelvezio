# Statistiche di Elvezio

Contatore anonimo per ilsignorelvezio.com e dashboard privata.

- `api/e.js` riceve gli eventi dal sito (visite, video, giochi, iscrizioni). Niente cookie e niente dati personali: solo un numero di sessione a caso.
- `api/stats.js` restituisce i totali alla dashboard (serve `ADMIN_PASSWORD`).
- `public/index.html` è la dashboard: apri l'indirizzo del progetto e inserisci la password.
- `theme/elvezio-track.liquid` è il pezzo che va nel tema Shopify (lo carica Claude).

## Impostazioni su Vercel
1. Storage → Create Database → Neon (Frankfurt, piano Free) → Connect al progetto. Crea da solo `DATABASE_URL`.
2. Settings → Environment Variables → `ADMIN_PASSWORD` = una password tua.
3. Deployments → ⋯ → Redeploy.

Le tabelle si creano da sole al primo evento.
