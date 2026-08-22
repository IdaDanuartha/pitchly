import { redirect } from "next/navigation";

import { MobileNav } from "@/components/dashboard/MobileNav";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar nama={user.nama} />
      <MobileNav nama={user.nama} />
      <div className="min-w-0 flex-1 bg-warm-paper">{children}</div>
    </div>
  );
}
