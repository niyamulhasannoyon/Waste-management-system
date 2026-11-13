import type { Metadata } from "next";
import React from "react";
import { SubpageShell } from "@/components/SubpageShell";

export const metadata: Metadata = {
  title: "ময়লার স্তূপ রিপোর্ট",
  description: "সাভারের অবৈধ ময়লার স্তূপ বা ড্রেন বন্ধের অভিযোগ ছবি ও জিপিএস অবস্থানসহ জমা দিন।",
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return <SubpageShell>{children}</SubpageShell>;
}
