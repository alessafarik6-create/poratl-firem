/**
 * Proměnné ve šablonách smlouvy o dílo (oddělovače {{ }}).
 * Nahrazování probíhá v pořadí: nejdřív tyto placeholdery, poté případně
 * tokeny z existujícího applyTemplateVariables (dodavatel.*, objednatel.*, …).
 */

export const CONTRACT_TEMPLATE_PLACEHOLDER_KEYS = [
  "nazev_firmy",
  "jmeno_zakaznika",
  "adresa",
  "ico",
  "datum",
  "nazev_zakazky",
  "cena",
] as const;

export type ContractTemplatePlaceholderKey =
  (typeof CONTRACT_TEMPLATE_PLACEHOLDER_KEYS)[number];

/** Popis proměnných pro nápovědu v UI (Markdown neužito – čistý text). */
export const CONTRACT_TEMPLATE_PLACEHOLDER_HELP = `
Dostupné proměnné (vložte přesně v uvedeném tvaru):

{{nazev_firmy}} — název vaší firmy (dodavatel)
{{jmeno_zakaznika}} — jméno nebo firma zákazníka
{{adresa}} — adresa zákazníka
{{ico}} — IČO zákazníka
{{datum}} — dnešní datum (česky)
{{nazev_zakazky}} — název aktuální zakázky
{{cena}} — rozpočet zakázky formátovaný v Kč (např. 720 000 Kč)
`.trim();

export type BuildContractPlaceholderValuesInput = {
  /** Název dodavatelské firmy (z firemního profilu). */
  nazevFirmy: string;
  /** Zobrazené jméno / firma zákazníka. */
  jmenoZakaznika: string;
  /** Adresa zákazníka. */
  adresa: string;
  /** IČO zákazníka. */
  ico: string;
  /** Datum (už naformátovaný řetězec, typicky cs-CZ). */
  datum: string;
  /** Název zakázky. */
  nazevZakazky: string;
  /** Cena včetně měny, např. „720 000 Kč“. */
  cena: string;
};

/**
 * Vytvoří mapu klíčů přesně podle zápisů v šabloně (např. nazev_firmy).
 */
export function buildContractPlaceholderValues(
  opts: BuildContractPlaceholderValuesInput
): Record<ContractTemplatePlaceholderKey, string> {
  return {
    nazev_firmy: opts.nazevFirmy,
    jmeno_zakaznika: opts.jmenoZakaznika,
    adresa: opts.adresa,
    ico: opts.ico,
    datum: opts.datum,
    nazev_zakazky: opts.nazevZakazky,
    cena: opts.cena,
  };
}

/**
 * Nahradí v textu šablony výskyty {{klíč}} hodnotami z mapy.
 * Neznámé klíče ponechá beze změny (zachová původní placeholder).
 */
export function applyContractTemplatePlaceholders(
  template: string,
  values: Record<string, string>
): string {
  if (!template) return "";
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (match, key: string) => {
      const v = values[key];
      return v !== undefined ? v : match;
    }
  );
}
