import type { EnrolmentStatus } from "@/generated/prisma/enums";

export const enrolmentStatusLabels: Record<EnrolmentStatus, string> = {
  ENROLLED: "Enrolled",
  DEFERRED: "Deferred",
  WITHDRAWN: "Withdrawn",
  COMPLETED: "Completed",
};

// Maps each enrolment status to the Badge variant that best signals its
// meaning: active/good (success), paused (warning), left permanently
// (destructive), finished (info, neutral rather than good or bad).
export const enrolmentStatusBadgeVariant: Record<
  EnrolmentStatus,
  "success" | "warning" | "destructive" | "info"
> = {
  ENROLLED: "success",
  DEFERRED: "warning",
  WITHDRAWN: "destructive",
  COMPLETED: "info",
};
