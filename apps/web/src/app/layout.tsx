import type { Metadata } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import "./globals.css";
import { CleanSavarProvider } from "@/context/CleanSavarContext";

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ক্লিন সাভার (Clean Savar) — সাভার স্মার্ট বর্জ্য ব্যবস্থাপনা",
    template: "%s | ক্লিন সাভার (Clean Savar)",
  },
  description:
    "সাভার পৌরসভা ও ইউনিয়ন পরিষদ এলাকায় বাসাবাড়ির ময়লা সংগ্রহের সময় নির্ধারণ এবং রাস্তার আবর্জনা রিপোর্টিং প্ল্যাটফর্ম।",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={`${hindSiliguri.variable} ${inter.variable} h-full`}>
      <body className="min-h-full bg-[#F8FAFC] text-[#0F172A] antialiased flex flex-col">
        <CleanSavarProvider>{children}</CleanSavarProvider>
      </body>
    </html>
  );
}
