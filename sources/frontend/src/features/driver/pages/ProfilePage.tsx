import { Header } from "@/components/Header";
import DriverProfile from "@/features/driver/pages/DriverProfile";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Profile" showBackButton backTo="/driver" />
      <main className="w-full px-4 py-6">
        <DriverProfile />
      </main>
    </div>
  );
}
