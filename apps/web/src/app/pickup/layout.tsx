import type { Metadata } from "next";
import React from "react";
import { SubpageShell } from "@/components/SubpageShell";

export const metadata: Metadata = {
  title: "পিকআপ সময়সূচি বুকিং",
  description: "সাভার পৌরসভা ও ইউনিয়নে বাসাবাড়ি, জৈব, রিসাইক্লেবল ও ভারী বর্জ্য পিকআপ বুকিং।",
};

export default function PickupLayout({ children }: { children: React.ReactNode }) {
  return <SubpageShell>{children}</SubpageShell>;
}
