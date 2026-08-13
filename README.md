# VISUAL SEARCH 2

Interface de recherche visuelle Next.js utilisant exclusivement les médias publics renvoyés par l’API VK.

## Variables Vercel

- `VK_SERVICE_TOKEN` : jeton d’accès VK côté serveur.
- `VK_API_VERSION` : optionnel, défaut `5.199`.

Aucun jeton n’est exposé au navigateur. Les recherches vidéo demandent `adult=1` lorsque la méthode VK le permet.
