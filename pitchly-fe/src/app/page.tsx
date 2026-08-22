import { ClosingCta } from "@/components/landing/ClosingCta";
import { DemoSimulation } from "@/components/landing/DemoSimulation";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { JudgePanel } from "@/components/landing/JudgePanel";
import { Pricing } from "@/components/landing/Pricing";
import { Problems } from "@/components/landing/Problems";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { fetchPlans } from "@/lib/billing.server";

export default async function Home() {
  const plans = await fetchPlans();
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <Problems />
        <DemoSimulation />
        <HowItWorks />
        <Features />
        <JudgePanel />
        <Pricing plans={plans} />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
