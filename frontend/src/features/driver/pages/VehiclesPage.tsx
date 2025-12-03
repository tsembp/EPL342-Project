import { Header } from "@/components/Header";
import { VehicleManagementSection } from "@/features/driver/components/VehicleManagementSection";

export default function VehiclesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Vehicles" showBackButton backTo="/driver" />
      <main className="w-full px-4 py-6">
        <VehicleManagementSection />
      </main>
    </div>
  );
}
