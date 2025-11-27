import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CarFront, CheckCircle2, XCircle } from "lucide-react"; // Added CheckCircle2 and XCircle
import { useQuery } from "@tanstack/react-query"; // Import useQuery
import { getDriverVehicles } from "@/features/driver/api"; // Import getDriverVehicles

export function VehicleManagementSection() {
  const navigate = useNavigate();

  const handleAddVehicleClick = () => {
    navigate("/driver/add-vehicle");
  };

  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: ["driverVehicles"],
    queryFn: getDriverVehicles,
  });

  const approvedVehicles = vehicles?.filter(
    (vehicle) => vehicle.IsApproved
  );
  const unapprovedVehicles = vehicles?.filter(
    (vehicle) => !vehicle.IsApproved
  );

  return (
    <Card className="border border-neutral-800 bg-neutral-900/80 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-50">
            My Vehicles
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            Manage your registered vehicles and add new ones.
          </p>
        </div>
        <Button
          onClick={handleAddVehicleClick}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
        >
          <CarFront className="h-4 w-4" />
          Add new vehicle
        </Button>
      </div>

      <div className="mt-6">
        {isLoading && <p className="text-neutral-400">Loading vehicles...</p>}
        {error && (
          <p className="text-red-500">Error loading vehicles: {error.message}</p>
        )}
        {!isLoading && !error && (
          <>
            <h3 className="text-sm font-semibold text-neutral-50 mb-2">
              Approved Vehicles ({approvedVehicles?.length || 0})
            </h3>
            {approvedVehicles && approvedVehicles.length > 0 ? (
              <ul className="space-y-2">
                {approvedVehicles.map((vehicle) => (
                  <li key={vehicle.VehicleId} className="flex items-center gap-2 text-sm text-neutral-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {vehicle.Brand} {vehicle.Model} ({vehicle.PlateNumber}) -{" "}
                    {vehicle.VehicleType}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-neutral-400">No approved vehicles to display.</p>
            )}

            <h3 className="text-sm font-semibold text-neutral-50 mt-4 mb-2">
              Unapproved Vehicles ({unapprovedVehicles?.length || 0})
            </h3>
            {unapprovedVehicles && unapprovedVehicles.length > 0 ? (
              <ul className="space-y-2">
                {unapprovedVehicles.map((vehicle) => (
                  <li key={vehicle.VehicleId} className="flex items-center gap-2 text-sm text-neutral-300">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {vehicle.Brand} {vehicle.Model} ({vehicle.PlateNumber}) -{" "}
                    {vehicle.VehicleType} (Status: {vehicle.VehicleStatus})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-neutral-400">No unapproved vehicles to display.</p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
