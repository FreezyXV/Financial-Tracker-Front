# Feuille de route — vers une app « payante »

Ce qui distingue les apps premium (Finary, YNAB, Copilot, Kubera) et ce qu'il reste à ajouter, par ordre d'impact.

## Livré (V1)
Patrimoine multi-enveloppes, import CSV + catégorisation apprenante, budgets avec report, PRU / TRI / dividendes, bilans mensuels avec constats, 50/30/20, pont patrimonial, détection d'abonnements, objectifs, simulateur FIRE, plafonds et fiscalité PEA / livrets / AV, thème sombre, mobile.

## P1 — à forte valeur
1. **Synchronisation bancaire automatique** (DSP2) : agrégateur type GoCardless Bank Account Data (gratuit, 2 300 banques UE), Powens ou Bridge. Supprime la saisie : c'est LA fonctionnalité qui justifie un abonnement.
2. **Synchro courtiers / exchanges** : import des relevés Trade Republic, Boursorama, Degiro (CSV) et API Binance / Kraken / Coinbase en lecture seule.
3. **Fiscalité** : estimation de l'impôt sur plus-values CTO (flat tax 30 %), assistant déclaration 2074 / 3916 (comptes à l'étranger) et 2086 (crypto), IFI.
4. **Notifications** : email/push hebdomadaire et bilan mensuel envoyé le 1er (Laravel Notifications + queue).
5. **Comparaison à un indice** : performance du portefeuille vs MSCI World, et TWR en plus du TRI.

## P2 — confort et différenciation
6. **Frais cachés** : détection des frais d'ETF (TER), de courtage et d'enveloppe ; coût sur 20 ans.
7. **Rééquilibrage** : allocation cible (ex. 70 % World / 20 % émergents / 10 % crypto) et ordres suggérés pour le prochain versement.
8. **Mode foyer** : comptes partagés, répartition des dépenses communes au prorata des revenus.
9. **Multi-devises complet** : devise de référence au choix (utile Luxembourg / Suisse), historique de change.
10. **Immobilier** : crédit avec tableau d'amortissement, loyers, rendement net, cash-flow.
11. **Assistant IA** : questions en langage naturel (« combien ai-je dépensé en restaurants depuis mars ? »), explication des écarts du mois.
12. **Pièces jointes** : factures et garanties sur les opérations, OCR des tickets.

## P3 — produit et monétisation
13. 2FA (TOTP), chiffrement des notes, export complet RGPD.
14. PWA installable + mode hors ligne.
15. Freemium : gratuit jusqu'à 3 comptes et saisie manuelle ; Premium (≈ 5 €/mois) avec synchro bancaire, IA, rapports fiscaux.
