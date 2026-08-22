import { CaraKerja } from "@/components/landing/CaraKerja";
import { CtaPenutup } from "@/components/landing/CtaPenutup";
import { DemoSimulasi } from "@/components/landing/DemoSimulasi";
import { Fitur } from "@/components/landing/Fitur";
import { Harga } from "@/components/landing/Harga";
import { Hero } from "@/components/landing/Hero";
import { Masalah } from "@/components/landing/Masalah";
import { PanelJuri } from "@/components/landing/PanelJuri";
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
        <Masalah />
        <DemoSimulasi />
        <CaraKerja />
        <Fitur />
        <PanelJuri />
        <Harga plans={plans} />
        <CtaPenutup />
      </main>
      <SiteFooter />
    </>
  );
}
