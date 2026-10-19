# Som Llar · Gestió de Compres

Aplicació web (React + Vite + Firebase) per gestionar les sol·licituds de compra de Som Llar:
circuit d'aprovació (Coordinació → Direcció d'Àrea → Finances), emissió de comandes,
recepció, pressupostos comparatius i proveïdors.

- Producció: https://compres-somllar.vercel.app (desplegament automàtic des de `main` a Vercel)
- Firebase: projecte `som-llar-compres`, base de dades Firestore `ai-studio-compras-48fb283c-…`
- Accés: només comptes Microsoft `@somllar.cat`

## Desenvolupament local

1. `npm install`
2. Copia `.env.example` a `.env.local` i omple els valors.
3. `npm run dev` (http://localhost:3000)

Comprovacions: `npm run lint` (TypeScript) i `npm run build`.

## Regles de seguretat de Firestore

Les regles són a `firestore.rules`. Per publicar-les:

- Des de la consola: Firebase → Firestore → base de dades `ai-studio-compras-…` → Regles → enganxar → Publicar.
- Des del CLI (amb un compte amb accés al projecte): `npx firebase deploy --only firestore:rules`.

Si canvies els rols o el circuit d'aprovació a `src/services/workflowService.ts`, revisa també `firestore.rules`.
