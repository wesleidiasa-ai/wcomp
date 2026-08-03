export const ROLES = ["admin", "comprador", "solicitante", "aprovador"] as const;
export type Role = (typeof ROLES)[number];
