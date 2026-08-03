"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { switchToStaff, switchToStudent } from "@/lib/session-actions";
import type { Session } from "@/lib/session";

type StudentOption = { id: string; fullName: string; studentId: string };

export function Nav({
  session,
  students,
}: {
  session: Session;
  students: StudentOption[];
}) {
  const pathname = usePathname();
  const [pickerValue, setPickerValue] = useState("");

  const links =
    session.role === "STAFF"
      ? [
          { href: "/", label: "Dashboard" },
          { href: "/students", label: "Students" },
          { href: "/assessments", label: "Assessments" },
        ]
      : [
          { href: `/students/${session.studentId}`, label: "My Profile" },
          { href: "/assessments", label: "Assessments" },
        ];

  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <span className="text-sm font-semibold tracking-wide uppercase">SMS Registry</span>
          <div className="flex flex-wrap gap-4">
            {links.map((link) => {
              const isActive =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm",
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {session.role === "STAFF" ? (
            <>
              <Select value={pickerValue} onValueChange={setPickerValue}>
                <SelectTrigger className="w-full sm:w-[200px]" size="sm">
                  <SelectValue placeholder="View as student...">
                    {(value: string) =>
                      students.find((s) => s.id === value)?.fullName ??
                      "View as student..."
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.fullName} ({student.studentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!pickerValue}
                onClick={() => switchToStudent(pickerValue)}
              >
                Switch
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => switchToStaff()}>
              Switch to Staff View
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
