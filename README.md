# Genova — Plateforme de génération d'apps

Interface utilisateur de la plateforme Genova : génère des sites web et apps mobiles à partir d'une description texte, avec boucle d'itération visuelle (Claude Vision) et déploiement automatique sur Vercel.

## Démarrage local

Ouvre simplement `index.html` dans un navigateur — aucun build requis.

## Déploiement Vercel

Importe ce repo sur [vercel.com/new](https://vercel.com/new). Aucune configuration nécessaire (site statique).

## Structure

- `index.html` — structure de l'interface (topbar, sidebar, 5 onglets)
- `style.css` — thème sombre, design system complet
- `app.js` — interactions : pipeline animé, onglets, modal, itérations
