# Il Signor Elvezio – progetto unico

Un solo progetto per tutto quello che non sta su Shopify. Il sito resta su Shopify.

| Cartella | Cosa c'è | Indirizzo |
|---|---|---|
| `api/` | il contatore (`/api/e`) e i numeri per la dashboard (`/api/stats`) | `/api/...` |
| `public/stats/` | la dashboard privata con password | `/stats` |
| `public/` | qui arriverà l'app di Elvezio (giochi, TG, notifiche) | `/` |
| `theme/` | i pezzi che Claude carica nel tema Shopify | – |

## Impostazioni su Vercel
1. Storage → Create Database → Neon (Frankfurt, piano Free) → Connect al progetto. Crea da solo `DATABASE_URL`.
2. Settings → Environment Variables → `ADMIN_PASSWORD` = una password tua.
3. Deployments → ⋯ → Redeploy.

Il contatore è anonimo: niente cookie e niente dati personali. Le tabelle si creano da sole al primo evento.
