import type { Metadata } from 'next';
import { Hind_Siliguri, Inter } from 'next/font/google';
import React from 'react';
import { OtpAuthDialog } from '@/components/OtpAuthDialog';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { CleanSavarProvider } from '@/context/CleanSavarContext';
import './globals.css';

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ক্লিন সাভার — সাভার পৌরসভা সমন্বিত বর্জ্য ব্যবস্থাপনা',
    template: '%s | ক্লিন সাভার',
  },
  description:
    'সাভার পৌরসভার ওয়ার্ড ১–৯ এবং ৬টি ইউনিয়নের জন্য ডোর-টু-ডোর পিকআপ শিডিউল, অবৈধ ময়লার স্তূপ রিপোর্ট, রিয়েল-টাইম ট্র্যাকিং ও রিসাইক্লিং সমন্বয় পোর্টাল।',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={`${hindSiliguri.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col bg-[#F8FAFC] text-[#0F172A] antialiased">
        <CleanSavarProvider>
          <a href="#main-content" className="cs-skip-link">
            মূল বিষয়বস্তুতে যান
          </a>
          <SiteHeader />
          <OtpAuthDialog />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </CleanSavarProvider>
      </body>
    </html>
  );
}
