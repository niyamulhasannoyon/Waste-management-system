import type { Metadata } from "next";
import React from "react";
import { SubpageShell } from "@/components/SubpageShell";

export const metadata: Metadata = {
  title: "রিসাইক্লিং পার্টনার লট মার্কেটপ্লেস",
  description: "সাভার পৌরসভার বাছাইকৃত প্লাস্টিক, কাগজ, ধাতব ও কাচের রিসাইক্লিং লট সংগ্রহ পোর্টাল।",
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <SubpageShell>{children}</SubpageShell>;
}
