import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Nav } from "@/components/nav";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const playfairDisplayHeading = Playfair_Display({subsets:['latin'],variable:'--font-heading'});

const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SMS Registry",
  description: "Student Management System - Registry Module",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, students] = await Promise.all([
    getSession(),
    prisma.student.findMany({
      select: { id: true, fullName: true, studentId: true, status: true, deferredAt: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", notoSans.variable, playfairDisplayHeading.variable)}
    >
      <body className="min-h-full">
        <Nav session={session} students={students} />
        {children}
      </body>
    </html>
  );
}
