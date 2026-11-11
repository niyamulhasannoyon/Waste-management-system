import React from "react";
import { SubpageShell } from "@/components/SubpageShell";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <SubpageShell>{children}</SubpageShell>;
}
