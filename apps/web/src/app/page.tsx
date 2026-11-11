import React from 'react';
import { CoverageSection } from '@/components/CoverageSection';
import { HeroSection } from '@/components/HeroSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { RecyclingSection } from '@/components/RecyclingSection';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <CoverageSection />
      <RecyclingSection />
    </>
  );
}
