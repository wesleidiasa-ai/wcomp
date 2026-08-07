/**
 * Ícone por palavra-chave no nome do setor. É uma heurística sobre texto livre
 * (cada empresa nomeia seus setores do jeito que quiser), não uma categoria real —
 * serve só pra melhorar a leitura visual da lista, não pra agrupar dados.
 */
const KEYWORD_ICONS: [RegExp, string][] = [
  [/agr[íi]cola|agro|lavoura|campo/i, "🌱"],
  [/oficina|manuten[çc][ãa]o|mec[âa]nica/i, "🛠"],
  [/m[áa]quina|equipamento/i, "🚜"],
  [/transporte|log[íi]stica|frota/i, "🚚"],
  [/administrativo|escrit[óo]rio|rh|financeiro/i, "📄"],
  [/almoxarifado|estoque/i, "📦"],
  [/cantina|cozinha|alimenta[çc][ãa]o/i, "🍽"],
  [/obra|constru[çc][ãa]o|engenharia/i, "🏗"],
  [/ti\b|tecnologia|inform[áa]tica/i, "💻"],
];

export function categoryIcon(departmentName: string | null | undefined): string {
  if (!departmentName) return "📁";
  const match = KEYWORD_ICONS.find(([pattern]) => pattern.test(departmentName));
  return match ? match[1] : "📁";
}
