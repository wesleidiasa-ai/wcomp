/** Diferença em dias de calendário (ignora hora do dia) entre agora e uma data futura. */
export function daysUntil(date: string): number {
  const target = new Date(date);
  const now = new Date();
  const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((dateOnly(target) - dateOnly(now)) / (1000 * 60 * 60 * 24));
}

export function deadlineLabel(days: number): string {
  if (days < 0) return "prazo vencido";
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  return `vence em ${days} dias`;
}
