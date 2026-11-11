import React from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { QuickActionWidget } from "@/components/QuickActionWidget";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { CoverageSection } from "@/components/CoverageSection";
import { RecyclingSection } from "@/components/RecyclingSection";
import { Footer } from "@/components/Footer";
import { ActionModal } from "@/components/ActionModal";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC]">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <HeroSection />
        <QuickActionWidget />
        <HowItWorksSection />
        <CoverageSection />
        <RecyclingSection />
      </main>
      <Footer />
      <ActionModal />
    </div>
  );
}
