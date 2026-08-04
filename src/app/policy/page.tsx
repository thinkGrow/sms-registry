import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Fees & Status Policy</h1>
        <p className="text-muted-foreground text-sm">
          A plain-language summary of how fees are billed and how your
          enrolment status affects them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How Fees Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Your total programme fee is split into equal yearly installments,
            one per year of study, 4 years for a Bachelor&apos;s degree, 2
            years for a Master&apos;s.
          </p>
          <p>
            You can pay for any year that hasn&apos;t been paid yet, in any
            order. Once a year is paid, it can&apos;t be paid again, and your
            payments can never add up to more than your total fee.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Your Status Means for Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Enrolled</p>
            <p className="text-muted-foreground">
              Business as usual. A new installment becomes due once a year,
              starting from the day you joined.
            </p>
          </div>
          <div>
            <p className="font-medium">Deferred</p>
            <p className="text-muted-foreground">
              Nothing changes right away. Your deferral takes effect on the
              1st of January the following year. From that date, your fee
              schedule pauses for one year, no new installment becomes due
              during that time. After that year, billing picks back up from
              where it paused. In practice, this pushes your final payment
              date back by about a year. You can still make a payment for
              any unpaid year at any time while deferred, even before your
              schedule resumes, deferral only pauses what&apos;s due, not
              what you&apos;re allowed to pay.
            </p>
          </div>
          <div>
            <p className="font-medium">Withdrawn</p>
            <p className="text-muted-foreground">
              You&apos;re still billed normally through the end of the year
              you withdraw in. After that, nothing further is ever due,
              your fee schedule is permanently closed at that point.
            </p>
          </div>
          <div>
            <p className="font-medium">Completed</p>
            <p className="text-muted-foreground">
              You&apos;ve finished your programme. Pay off any remaining
              overdue balance, then contact the registry to receive your
              certificate.
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        This page is a summary for reference. If anything here doesn&apos;t
        match what you see on your own account, contact the registry.
      </p>
    </div>
  );
}
