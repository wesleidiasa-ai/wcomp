export function formatRelativeDate(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((startOfNow.getTime() - startOfThen.getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;

  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;

  const years = Math.floor(months / 12);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

export function daysSince(iso: string): number {
  const then = new Date(iso);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}
