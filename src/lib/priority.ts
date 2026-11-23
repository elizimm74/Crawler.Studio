// How urgent a problem or fix is, from COUNTS (never an AI guess): the share of all simulated
// customers it affects. Same rule everywhere (home demo, reports, copy prompt), and benched.
export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export function priorityFor(affected: number, total: number): Priority {
  if (total <= 0 || affected <= 0) return "Low";
  const share = affected / total;
  if (share >= 0.25) return "Critical";
  if (share >= 0.12) return "High";
  if (share >= 0.05) return "Medium";
  return "Low";
}
