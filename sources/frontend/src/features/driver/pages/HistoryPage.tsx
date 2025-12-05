import { Header } from "@/components/Header";
import { DriverHistorySection } from "@/features/driver/pages/DriverHistorySection";

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Ride History" showBackButton backTo="/driver" />
      <main className="w-full px-4 py-6">
        <DriverHistorySection />
      </main>
    </div>
  );
}
