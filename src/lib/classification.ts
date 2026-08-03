export type GradeClassification = "FAIL" | "PASS" | "MERIT" | "DISTINCTION";

export const classificationLabels: Record<GradeClassification, string> = {
  FAIL: "Fail",
  PASS: "Pass",
  MERIT: "Merit",
  DISTINCTION: "Distinction",
};

export const classificationBadgeVariant: Record<
  GradeClassification,
  "destructive" | "secondary" | "info" | "success"
> = {
  FAIL: "destructive",
  PASS: "secondary",
  MERIT: "info",
  DISTINCTION: "success",
};

// Computed from score at read time, never stored, same principle as every
// other derived field in this app (overdue, late, age).
export function classifyGrade(score: number): GradeClassification {
  if (score >= 70) return "DISTINCTION";
  if (score >= 60) return "MERIT";
  if (score >= 40) return "PASS";
  return "FAIL";
}
