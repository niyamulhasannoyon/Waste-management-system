import React from "react";
import { SubpageShell } from "@/components/SubpageShell";

export default function PickupLayout({ children }: { children: React.ReactNode }) {
  return <SubpageShell>{children}</SubpageShell>;
}
