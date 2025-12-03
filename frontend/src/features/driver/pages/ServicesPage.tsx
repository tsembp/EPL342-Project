import { Header } from "@/components/Header";
import { DriverServicesSection } from "@/features/driver/pages/DriverServicesSection";

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Services" showBackButton backTo="/driver" />
      <main className="w-full px-4 py-6">
        <DriverServicesSection />
      </main>
    </div>
  );
}
