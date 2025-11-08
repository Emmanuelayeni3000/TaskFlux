import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fira_Mono } from "next/font/google";
import "./globals.css";
import AuthWrapper from "@/components/auth-wrapper";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const firaMono = Fira_Mono({
  variable: "--font-fira-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "TaskFlux",
  description: "A modern, lightweight task management web app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakartaSans.variable} ${firaMono.variable} antialiased`}
      >
        <AuthWrapper>{children}</AuthWrapper>
      </body>
    </html>
  );
}
