import { HeroSection } from "@/components/sections/hero-section";
import { FeaturesSection } from "@/components/sections/features-section";
import { ScreenshotsSection } from "@/components/sections/screenshots-section";
import { UseCasesSection } from "@/components/sections/use-cases-section";
import { TechStackSection } from "@/components/sections/tech-stack-section";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { FAQSection } from "@/components/sections/faq-section";
import { ChangelogSection } from "@/components/sections/changelog-section";
import { RoadmapSection } from "@/components/sections/roadmap-section";
import { CTASection } from "@/components/sections/cta-section";

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <ScreenshotsSection />
      <UseCasesSection />
      <TechStackSection />
      <TestimonialsSection />
      <FAQSection />
      <ChangelogSection />
      <RoadmapSection />
      <CTASection />
    </>
  );
}
