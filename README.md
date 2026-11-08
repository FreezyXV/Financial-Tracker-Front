# Registre — Front (Angular 19)

Interface du gestionnaire de finances personnelles **Registre**. API : [Financial-Tracker-Back](https://github.com/FreezyXV/Financial-Tracker-Back).

## Fonctionnalités

| Module | Contenu |
|---|---|
| Accueil personnalisé | Questionnaire en 7 étapes à l'inscription (âge, pays, foyer, statut pro, logement, revenus et charges, comptes détenus, objectifs, profil de risque, méthode de budget) avec fiche récapitulative en direct : crée comptes, catégories adaptées (URSSAF, enfants, crédit immo…), objectifs chiffrés, budgets calibrés et échéancier. Modifiable depuis Réglages |
| Plan d'action | Recommandations classées, recalculées à partir du profil et des chiffres réels : coussin de sécurité, dettes chères, taux d'épargne, livrets pleins, PEA/AV/PER à ouvrir, TMI estimée, excédent de liquidités, concentration, expatriation, résidence luxembourgeoise |
| Synthèse | Patrimoine net et historique 12 mois, variation 30 j / depuis janvier, cashflow, répartition, budgets, échéances, objectifs, épargne de précaution en mois |
| Opérations | Filtres (mois, compte, catégorie, type, recherche), recatégorisation dans la liste, actions groupées, **import CSV bancaire** (débit/crédit ou montant signé, formats FR, dédoublonnage), export CSV |
| Comptes | Courant, Livret A, LDDS, LEP, PEL, PEA, PEA-PME, CTO, assurance-vie, PER, crypto, immobilier, crédits ; plafonds réglementaires ; date d'avantage fiscal (PEA 5 ans, AV 8 ans) |
| Budgets | Enveloppes mensuelles, report du reliquat, seuil d'alerte, projection de fin de mois, suggestions basées sur la moyenne 3 mois |
| Placements | Positions au PRU, plus-values latentes et réalisées, dividendes, frais, **TRI annualisé**, diversification (classe, zone, secteur), cours Yahoo/CoinGecko, recherche d'instruments, contrôle d'éligibilité PEA, actifs en devises |
| Bilans | Mensuel : relevé, taux d'épargne, constats automatiques, 50/30/20, pont patrimonial (épargne vs marchés), rythme des dépenses ; annuel ; export PDF |
| Objectifs | Suivi manuel ou lié à un compte, effort mensuel, avec ou sans rendement |
| Échéances | Abonnements, salaires, virements programmés, passage automatique, **détection des prélèvements récurrents** |
| Projection | Simulateur FIRE (inflation, hausse de l'épargne, taux de retrait), scénarios 4/6/8 %, gain de +100 €/mois |
| Réglages | Profil, objectif d'épargne, seuil d'alerte, catégories (essentielles, sous-catégories), règles de classement |

Thème clair/sombre, responsive mobile (navigation basse), alertes in-app.

## Démarrage

```bash
npm ci
npm start          # http://localhost:4200 (API attendue sur http://127.0.0.1:8000/api)
npm run build      # production (src/environments/environment.prod.ts → apiUrl)
npm run test:ci    # tests unitaires (CSV, projection) en Chrome headless
```

Compte de démo (après `php artisan migrate:fresh --seed` côté API) : `demo@finance.test` / `password`.

## Structure

`src/app/core` (API, auth par token, store, modèles, libellés métier) · `src/app/shared` (graphiques Chart.js, formatage FR, parseur CSV, calculs de projection) · `src/app/features/*` (une page par module, chargée à la demande) · `src/styles.scss` (système visuel « Registre »).

Feuille de route : [ROADMAP.md](ROADMAP.md).
