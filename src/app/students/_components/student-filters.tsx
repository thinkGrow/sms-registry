"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { enrolmentStatusValues } from "@/lib/validations/student";
import { enrolmentStatusLabels } from "@/lib/student-status";
import type { SerializedProgramme } from "@/lib/serialize";

const ALL = "all";

export function StudentFilters({ programmes }: { programmes: SerializedProgramme[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Search by name or student ID..."
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => updateParam("search", e.target.value)}
        className="max-w-xs"
      />

      <Select
        defaultValue={searchParams.get("programmeId") ?? ALL}
        onValueChange={(value) => updateParam("programmeId", value)}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="All programmes">
            {(value: string) =>
              value === ALL || !value
                ? "All programmes"
                : programmes.find((p) => p.id === value)?.name
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All programmes</SelectItem>
          {programmes.map((programme) => (
            <SelectItem key={programme.id} value={programme.id}>
              {programme.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("status") ?? ALL}
        onValueChange={(value) => updateParam("status", value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All statuses">
            {(value: string) =>
              value === ALL || !value
                ? "All statuses"
                : enrolmentStatusLabels[value as keyof typeof enrolmentStatusLabels]
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {enrolmentStatusValues.map((status) => (
            <SelectItem key={status} value={status}>
              {enrolmentStatusLabels[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
