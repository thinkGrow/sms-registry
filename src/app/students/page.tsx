import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StudentFilters } from "./_components/student-filters";
import { StudentsTable } from "./_components/students-table";
import { StudentFormDialog } from "./_components/student-form-dialog";
import { enrolmentStatusValues } from "@/lib/validations/student";
import { serializeProgramme, serializeStudent } from "@/lib/serialize";

type SearchParams = {
  search?: string;
  programmeId?: string;
  status?: string;
};

function isValidStatus(
  value: string | undefined
): value is (typeof enrolmentStatusValues)[number] {
  return (
    value !== undefined &&
    (enrolmentStatusValues as readonly string[]).includes(value)
  );
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { search, programmeId, status } = await searchParams;

  const [students, programmes] = await Promise.all([
    prisma.student.findMany({
      where: {
        ...(search && {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { studentId: { contains: search, mode: "insensitive" } },
          ],
        }),
        ...(programmeId && { programmeId }),
        ...(isValidStatus(status) && { status }),
      },
      include: { programme: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.programme.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serializedProgrammes = programmes.map(serializeProgramme);
  const serializedStudents = students.map((student) => ({
    ...serializeStudent(student),
    programme: serializeProgramme(student.programme),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Students</h1>
          <p className="text-muted-foreground text-sm">
            {students.length} student{students.length === 1 ? "" : "s"}
          </p>
        </div>
        <StudentFormDialog programmes={serializedProgrammes} />
      </div>

      <Card>
        <CardHeader>
          <StudentFilters programmes={serializedProgrammes} />
        </CardHeader>
        <CardContent>
          <StudentsTable students={serializedStudents} programmes={serializedProgrammes} />
        </CardContent>
      </Card>
    </div>
  );
}
