/** Libellés et métadonnées métier (enveloppes françaises). */

export interface AccountTypeMeta {
  label: string;
  group: string;
  ceiling?: number;
  hint?: string;
  investment?: boolean;
}

export const ACCOUNT_TYPES: Record<string, AccountTypeMeta> = {
  checking: { label: 'Compte courant', group: 'liquidites' },
  cash: { label: 'Espèces', group: 'liquidites' },
  savings: { label: 'Compte épargne', group: 'epargne' },
  livret_a: { label: 'Livret A', group: 'epargne', ceiling: 22950, hint: 'Plafond 22 950 € hors intérêts' },
  ldds: { label: 'LDDS', group: 'epargne', ceiling: 12000, hint: 'Plafond 12 000 € hors intérêts' },
  lep: { label: 'LEP', group: 'epargne', ceiling: 10000, hint: 'Plafond 10 000 €, sous conditions de revenus' },
  pel: { label: 'PEL', group: 'epargne', ceiling: 61200, hint: 'Plafond 61 200 €' },
  pea: { label: 'PEA', group: 'investissements', ceiling: 150000, investment: true, hint: 'Versements plafonnés à 150 000 €, exonération d’impôt sur le revenu après 5 ans' },
  pea_pme: { label: 'PEA-PME', group: 'investissements', ceiling: 225000, investment: true, hint: 'Plafond cumulé PEA + PEA-PME : 225 000 €' },
  cto: { label: 'Compte-titres', group: 'investissements', investment: true, hint: 'Flat tax 30 % sur plus-values et dividendes' },
  assurance_vie: { label: 'Assurance-vie', group: 'investissements', investment: true, hint: 'Abattement annuel après 8 ans' },
  per: { label: 'PER', group: 'investissements', investment: true, hint: 'Versements déductibles du revenu imposable' },
  crypto: { label: 'Crypto', group: 'crypto', investment: true },
  real_estate: { label: 'Immobilier', group: 'immobilier', hint: 'Valeur estimée saisie manuellement' },
  loan: { label: 'Crédit / dette', group: 'dettes', hint: 'Solde négatif = capital restant dû' },
  other: { label: 'Autre', group: 'autres' },
};

export const GROUPS: Record<string, { label: string; color: string }> = {
  liquidites: { label: 'Liquidités', color: '#3d5a80' },
  epargne: { label: 'Épargne réglementée', color: '#6a8bb0' },
  investissements: { label: 'Placements', color: '#1f7a5c' },
  crypto: { label: 'Crypto', color: '#c9a65a' },
  immobilier: { label: 'Immobilier', color: '#5c4b8a' },
  dettes: { label: 'Dettes', color: '#b23a3a' },
  autres: { label: 'Autres', color: '#8a8f98' },
};

export const ASSET_CLASSES: Record<string, { label: string; color: string }> = {
  etf: { label: 'ETF', color: '#1f7a5c' },
  stock: { label: 'Actions', color: '#3d5a80' },
  crypto: { label: 'Crypto', color: '#c9a65a' },
  bond: { label: 'Obligations', color: '#6a8bb0' },
  fund: { label: 'Fonds / UC', color: '#5c4b8a' },
  reit: { label: 'SCPI / foncières', color: '#a07a2c' },
  commodity: { label: 'Matières premières', color: '#8a6d3b' },
  cash: { label: 'Liquidités', color: '#93acc9' },
  real_estate: { label: 'Immobilier', color: '#7a5ca8' },
  other: { label: 'Autres', color: '#8a8f98' },
};

export const OPERATION_TYPES: Record<string, string> = {
  buy: 'Achat',
  sell: 'Vente',
  dividend: 'Dividende',
  interest: 'Intérêts',
  fee: 'Frais',
};

export const FREQUENCIES: Record<string, string> = {
  weekly: 'Hebdomadaire',
  monthly: 'Mensuelle',
  quarterly: 'Trimestrielle',
  yearly: 'Annuelle',
};

export const TX_TYPES: Record<string, string> = {
  expense: 'Dépense',
  income: 'Revenu',
  transfer: 'Virement',
};

export function accountLabel(type: string): string {
  return ACCOUNT_TYPES[type]?.label ?? type;
}

export function isInvestmentType(type: string): boolean {
  return !!ACCOUNT_TYPES[type]?.investment;
}

export const PALETTE = ['#1b2a4a', '#1f7a5c', '#a07a2c', '#b23a3a', '#3d5a80', '#5c4b8a', '#c9a65a', '#6a8bb0', '#2f8f6f', '#8a8f98'];
