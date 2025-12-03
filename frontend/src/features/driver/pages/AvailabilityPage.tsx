import { Header } from "@/components/Header";
import { DriverAvailabilitySection } from "@/features/driver/pages/DriverAvailabilitySection";

export default function AvailabilityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Availability" showBackButton backTo="/driver" />
      <main className="w-full px-4 py-6">
        <DriverAvailabilitySection />
      </main>
    </div>
  );
}
