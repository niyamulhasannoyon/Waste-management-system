import type { Metadata } from "next";
import React from "react";
import { SubpageShell } from "@/components/SubpageShell";

export const metadata: Metadata = {
  title: "পিকআপ ও অভিযোগ ট্র্যাকিং",
  description: "ট্র্যাকিং কোড বা মোবাইল নম্বর দিয়ে বর্জ্য পিকআপ ও পরিচ্ছন্নতা অভিযোগের লাইভ অবস্থা দেখুন।",
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <SubpageShell>{children}</SubpageShell>;
}
