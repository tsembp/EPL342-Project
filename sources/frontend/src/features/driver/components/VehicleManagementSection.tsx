import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CarFront, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDriverVehicles } from "@/features/driver/api";

export function VehicleManagementSection() {
  const navigate = useNavigate();

  const handleAddVehicleClick = () => {
    navigate("/driver/add-vehicle");
  };

  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: ["driverVehicles"],
    queryFn: getDriverVehicles,
  });

  const acceptedVehicles = vehicles?.filter(
    (vehicle) => vehicle.IsApproved && vehicle.VehicleStatus === 'Active'
  );

  const vehiclesAwaitingApproval = vehicles?.filter(
    (vehicle) => !vehicle.IsApproved && vehicle.HasAllRequiredDocsSubmitted
  );

  const vehiclesMissingDocuments = vehicles?.filter(
    (vehicle) => !vehicle.HasAllRequiredDocsSubmitted
  );

  return (
    <div className="space-y-4">
      <Card className="border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              My Vehicles
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage your registered vehicles and add new ones.
            </p>
          </div>
          <Button
            onClick={handleAddVehicleClick}
            className="flex items-center gap-2 bg-black text-white hover:bg-gray-800"
          >
            <CarFront className="h-4 w-4" />
            Add Vehicle
          </Button>
        </div>

        {isLoading && (
          <div className="py-8 text-center">
            <p className="text-gray-500">Loading vehicles...</p>
          </div>
        )}
        
        {error && (
          <div className="py-4 px-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">Error loading vehicles: {error.message}</p>
          </div>
        )}
        
        {!isLoading && !error && (
          <div className="space-y-6">
            {/* Accepted Vehicles */}
            {acceptedVehicles && acceptedVehicles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Active Vehicles ({acceptedVehicles.length})
                </h3>
                <div className="space-y-2">
                  {acceptedVehicles.map((vehicle) => (
                    <div key={vehicle.VehicleId} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-black flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {vehicle.Brand} {vehicle.Model}
                        </p>
                        <p className="text-xs text-gray-600">
                          {vehicle.PlateNumber} • {vehicle.VehicleType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting Approval */}
            {vehiclesAwaitingApproval && vehiclesAwaitingApproval.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Awaiting Approval ({vehiclesAwaitingApproval.length})
                </h3>
                <div className="space-y-2">
                  {vehiclesAwaitingApproval.map((vehicle) => (
                    <div key={vehicle.VehicleId} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {vehicle.Brand} {vehicle.Model}
                        </p>
                        <p className="text-xs text-gray-600">
                          {vehicle.PlateNumber} • {vehicle.VehicleType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Documents */}
            {vehiclesMissingDocuments && vehiclesMissingDocuments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Action Required ({vehiclesMissingDocuments.length})
                </h3>
                <div className="space-y-2">
                  {vehiclesMissingDocuments.map((vehicle) => (
                    <div key={vehicle.VehicleId} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {vehicle.Brand} {vehicle.Model}
                        </p>
                        <p className="text-xs text-gray-600">
                          {vehicle.PlateNumber} • {vehicle.VehicleType}
                        </p>
                        <p className="text-xs text-red-600 mt-1">Missing required documents</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => navigate("/driver/VehicleDocuments", { state: { vehicleId: vehicle.VehicleId } })}
                      >
                        Submit Docs
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Vehicles */}
            {(!acceptedVehicles || acceptedVehicles.length === 0) && 
             (!vehiclesAwaitingApproval || vehiclesAwaitingApproval.length === 0) && 
             (!vehiclesMissingDocuments || vehiclesMissingDocuments.length === 0) && (
              <div className="py-12 text-center">
                <CarFront className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No vehicles registered yet</p>
                <Button
                  onClick={handleAddVehicleClick}
                  className="mt-4 bg-black text-white hover:bg-gray-800"
                >
                  Add Your First Vehicle
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
