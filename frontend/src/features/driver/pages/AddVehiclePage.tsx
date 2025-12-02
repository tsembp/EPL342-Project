import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Car } from "lucide-react";

import {
  addVehicle,
  getVehicleTypeRequirements,
  type VehicleTypeRequirementRow,
} from "@/features/driver/api";

interface VehicleType {
  vehicleTypeId: number;
  type: string;
  description: string;
}

const VEHICLE_BRANDS = [
  "Abarth","Acura","Aixam","Alfa Romeo","Ariel","Arrinera","Aspark","Aston Martin",
  "Audi","BAIC","Baojun","Beijing Auto","Bentley","BMW","Borgward","Brilliance",
  "Bugatti","Buick","BYD","Cadillac","Canoo","Changan","Chery","Chevrolet",
  "Chrysler","Citroën","Cupra","Dacia","Daewoo","Daihatsu","Datsun","Denza",
  "Dodge","Donkervoort","Eagle","FAW","Faraday Future","Ferrari","Fiat","Fisker",
  "Foton","Ford","GAC","Genius","Genesis","Geely","GMC","Great Wall","Haval",
  "Hindustan Motors","Hino","Holden","Honda","Hongqi","Hozon Neta","Hummer",
  "Hyundai","Infiniti","Iran Khodro","Isuzu","Iveco","JAC","Jaguar","Jeep","JMC",
  "Karma","Kia","Koenigsegg","KTM","Lada","Lamborghini","Lancia","Land Rover",
  "Lexus","Lincoln","Lotus","Lucid","Luxgen","Mahindra","Maruti Suzuki",
  "Maserati","Maybach","Mazda","McLaren","Mercedes-Benz","Mercury","MG","Mini",
  "Mitsubishi","Morgan","NIO","Nissan","Opel","Pagani","Peugeot","Pininfarina",
  "Polestar","Pontiac","Porsche","Proton","Ram","Range Rover","Renault","Rimac",
  "Rivian","Rolls-Royce","Roewe","Rover","Saab","Saturn","Scion","Seat",
  "Škoda","Smart","Sion","Spyker","SsangYong","Subaru","Suzuki","Tata","Tazzari",
  "Tesla","Toyota","UAZ","Van","Vauxhall","VinFast","Volkswagen","Volvo",
  "Wuling","Yugo","Zastava","Zhengzhou Nissan","Zotye"
];

// Hardcoded vehicle types
const HARDCODED_VEHICLE_TYPES: VehicleType[] = [
  { vehicleTypeId: 1, type: "Convertible", description: "Convertible car" },
  { vehicleTypeId: 2, type: "Coupe", description: "Coupe car" },
  { vehicleTypeId: 3, type: "Crossover", description: "Crossover car" },
  { vehicleTypeId: 4, type: "Electric Car", description: "Electric car" },
  { vehicleTypeId: 5, type: "Hatchback", description: "Hatchback car" },
  { vehicleTypeId: 6, type: "Hybrid Car", description: "Hybrid car" },
  { vehicleTypeId: 7, type: "Luxury Car", description: "Luxury car" },
  { vehicleTypeId: 8, type: "Minivan", description: "Minivan" },
  { vehicleTypeId: 9, type: "Pickup Truck", description: "Pickup truck" },
  { vehicleTypeId: 10, type: "SUV", description: "SUV" },
  { vehicleTypeId: 11, type: "Sedan", description: "Sedan car" },
  { vehicleTypeId: 12, type: "Sports Car", description: "Sports car" },
];

// Fallback requirements (used if API fails)
const FALLBACK_REQUIREMENTS: VehicleTypeRequirementRow[] = [
  { VehicleTypeId: 1, Name: "Convertible", NumOfSeats: 2, MinCargoVolume: 0.2, MinCargoWeight: 0 },
  { VehicleTypeId: 2, Name: "Coupe",       NumOfSeats: 2, MinCargoVolume: 0.25, MinCargoWeight: 0 },
  { VehicleTypeId: 3, Name: "Crossover",   NumOfSeats: 5, MinCargoVolume: 0.6, MinCargoWeight: 0 },
  { VehicleTypeId: 4, Name: "Electric Car",NumOfSeats: 5, MinCargoVolume: 0.35, MinCargoWeight: 0 },
  { VehicleTypeId: 5, Name: "Hatchback",   NumOfSeats: 4, MinCargoVolume: 0.35, MinCargoWeight: 0 },
  { VehicleTypeId: 6, Name: "Hybrid Car",  NumOfSeats: 5, MinCargoVolume: 0.4, MinCargoWeight: 0 },
  { VehicleTypeId: 7, Name: "Luxury Car",  NumOfSeats: 4, MinCargoVolume: 0.45, MinCargoWeight: 0 },
  { VehicleTypeId: 8, Name: "Minivan",     NumOfSeats: 7, MinCargoVolume: 1.0, MinCargoWeight: 0 },
  { VehicleTypeId: 9, Name: "Pickup Truck",NumOfSeats: 2, MinCargoVolume: 1.5, MinCargoWeight: 800 },
  { VehicleTypeId: 10, Name: "SUV",        NumOfSeats: 5, MinCargoVolume: 0.8, MinCargoWeight: 0 },
  { VehicleTypeId: 11, Name: "Sedan",      NumOfSeats: 4, MinCargoVolume: 0.4, MinCargoWeight: 0 },
  { VehicleTypeId: 12, Name: "Sports Car", NumOfSeats: 2, MinCargoVolume: 0.15, MinCargoWeight: 0 },
];

export default function AddVehiclePage() {
  const navigate = useNavigate();

  const [plateNumber, setPlateNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [seats, setSeats] = useState<number | string>("");
  const [cargoVolume, setCargoVolume] = useState<number | string>("");
  const [cargoWeight, setCargoWeight] = useState<number | string>("");
  const [pricePerKm, setPricePerKm] = useState<number | string>("");
  const [vehicleTypeId, setVehicleTypeId] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hardcoded vehicle types
  const vehicleTypes = HARDCODED_VEHICLE_TYPES;

  // Requirements query (view via stored procedure behind the endpoint)
  const {
    data: requirementsResponse,
    isLoading: requirementsLoading,
  } = useQuery({
    queryKey: ["driver", "vehicle-type-requirements"],
    queryFn: getVehicleTypeRequirements,
  });

  const allRequirements: VehicleTypeRequirementRow[] = useMemo(() => {
    if (requirementsResponse && requirementsResponse.success) {
      return requirementsResponse.types;
    }
    return FALLBACK_REQUIREMENTS;
  }, [requirementsResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!vehicleTypeId || !plateNumber || !brand || !model || !color || !seats || !pricePerKm) {
      toast.error("Please fill in all required vehicle details.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await addVehicle({
        vehicleTypeId: Number(vehicleTypeId),
        plateNumber,
        brand,
        model,
        color,
        seats: Number(seats),
        cargoVolume: cargoVolume ? Number(cargoVolume) : undefined,
        cargoWeight: cargoWeight ? Number(cargoWeight) : undefined,
        pricePerKm: Number(pricePerKm),
      });

      if (response.success && response.vehicleId) {
        toast.success(
          "Vehicle added successfully. Next: upload your vehicle documents."
        );
        navigate("/driver/VehicleDocuments", {
          state: { vehicleId: response.vehicleId },
        });
      } else {
        toast.error(response.error || "Failed to add vehicle.");
      }
    } catch (error) {
      toast.error(
        `Error adding vehicle: ${
          error instanceof Error ? error.message : "An unknown error occurred."
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-6 text-neutral-50">
      {/* Wider container with two big side-by-side boxes */}
      <div className="mx-auto grid max-w-8xl gap-8 md:grid-cols-2">
        {/* LEFT: Add vehicle form */}
        <Card className="border border-neutral-800 bg-neutral-900/80 p-5 sm:p-6 min-h-[750px]">
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900">
                <Car className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-neutral-50">
                  Add a vehicle
                </h1>
                <p className="mt-1 text-xs text-neutral-400">
                  Register a vehicle you&apos;ll use for rides and deliveries.
                </p>
              </div>
            </div>
            <Badge className="hidden border border-neutral-700 bg-neutral-900/80 text-[11px] font-normal text-neutral-300 sm:inline-flex">
              Driver onboarding · Vehicle
            </Badge>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-2 grid grid-cols-1 gap-4 text-sm md:grid-cols-2"
          >
            {/* Vehicle type */}
            <div className="space-y-1.5 md:col-span-2">
              <Label
                htmlFor="vehicleType"
                className="text-xs font-medium text-neutral-300"
              >
                Vehicle type
              </Label>
              <select
                id="vehicleType"
                className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-100 ring-offset-background placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={vehicleTypeId}
                onChange={(e) => setVehicleTypeId(e.target.value)}
                required
              >
                <option value="">Select a vehicle type</option>
                {vehicleTypes?.map((type) => (
                  <option key={type.vehicleTypeId} value={type.vehicleTypeId}>
                    {type.type}
                  </option>
                ))}
              </select>
              {vehicleTypes && vehicleTypes.length > 0 && (
                <p className="text-[11px] text-neutral-500">
                  Different vehicle types may unlock different service
                  categories.
                </p>
              )}
            </div>

            {/* Plate number */}
            <div className="space-y-1.5">
              <Label
                htmlFor="plateNumber"
                className="text-xs font-medium text-neutral-300"
              >
                Plate number
              </Label>
              <Input
                id="plateNumber"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                className="border-neutral-800 bg-neutral-950 text-sm text-neutral-100 placeholder:text-neutral-500"
                placeholder="KAA123"
                required
              />
            </div>

            {/* Brand */}
            <div className="space-y-1.5">
              <Label
                htmlFor="brand"
                className="text-xs font-medium text-neutral-300"
              >
                Brand
              </Label>
              <select
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="flex h-10 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                required
              >
                <option value="">Select brand</option>
                {VEHICLE_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <Label
                htmlFor="model"
                className="text-xs font-medium text-neutral-300"
              >
                Model
              </Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="border-neutral-800 bg-neutral-950 text-sm text-neutral-100 placeholder:text-neutral-500"
                placeholder="e.g. Corolla, X5"
                required
              />
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label
                htmlFor="color"
                className="text-xs font-medium text-neutral-300"
              >
                Color
              </Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border-neutral-800 bg-neutral-950 text-sm text-neutral-100 placeholder:text-neutral-500"
                placeholder="e.g. Black"
                required
              />
            </div>

            {/* Seats */}
            <div className="space-y-1.5">
              <Label
                htmlFor="seats"
                className="text-xs font-medium text-neutral-300"
              >
                Seats
              </Label>
              <Input
                id="seats"
                type="number"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                min="1"
                className="border-neutral-800 bg-neutral-950 text-sm text-neutral-100 placeholder:text-neutral-500"
                placeholder="e.g. 4"
                required
              />
            </div>

            {/* Cargo volume */}
            <div className="space-y-1.5">
              <Label
                htmlFor="cargoVolume"
                className="text-xs font-medium text-neutral-300"
              >
                Cargo volume (m³)
              </Label>
              <Input
                id="cargoVolume"
                type="number"
                step="0.01"
                value={cargoVolume}
                onChange={(e) => setCargoVolume(e.target.value)}
                className="border-neutral-800 bg-neutral-950 text-sm text-neutral-100 placeholder:text-neutral-500"
                placeholder="Optional"
              />
            </div>

            {/* Cargo weight */}
            <div className="space-y-1.5">
              <Label
                htmlFor="cargoWeight"
                className="text-xs font-medium text-neutral-300"
              >
                Cargo weight (kg)
              </Label>
              <Input
                id="cargoWeight"
                type="number"
                step="0.01"
                value={cargoWeight}
                onChange={(e) => setCargoWeight(e.target.value)}
                className="border-neutral-800 bg-neutral-950 text-sm text-neutral-100 placeholder:text-neutral-500"
                placeholder="Optional"
              />
            </div>

            {/* Price Per Km */}
            <div className="space-y-1.5">
              <Label
                htmlFor="pricePerKm"
                className="text-xs font-medium text-neutral-300"
              >
                Price per km (€)
              </Label>
              <Input
                id="pricePerKm"
                type="number"
                step="0.01"
                min="0.01"
                value={pricePerKm}
                onChange={(e) => setPricePerKm(e.target.value)}
                className="border-neutral-800 bg-neutral-950 text-sm text-neutral-100 placeholder:text-neutral-500"
                placeholder="e.g. 2.50"
                required
              />
              <p className="text-[11px] text-neutral-500">
                Your rate per kilometer for this vehicle.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-2 md:col-span-2">
              <Button
                type="submit"
                className="flex w-full items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding vehicle…
                  </>
                ) : (
                  "Add vehicle"
                )}
              </Button>
              <p className="mt-2 text-[11px] text-neutral-500">
                Once your vehicle is added, you&apos;ll be asked to upload the
                required vehicle documents for verification.
              </p>
            </div>
          </form>
        </Card>

        {/* RIGHT: Vehicle type requirements (bigger, no vertical scroll) */}
        <VehicleTypeRequirementsCard
          requirements={allRequirements}
          isLoading={requirementsLoading}
        />
      </div>
    </div>
  );
}

function VehicleTypeRequirementsCard({
  requirements,
  isLoading,
}: {
  requirements: VehicleTypeRequirementRow[];
  isLoading: boolean;
}) {
  return (
    <Card className="border border-neutral-800 bg-neutral-900/80 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-neutral-50">
        Vehicle type requirements
      </h2>
      <p className="mt-1 text-xs text-neutral-400">
        Minimum seats and cargo capacity expected for each vehicle type.
      </p>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading requirements…
        </div>
      ) : (
        // No max-h / overflow-y here → full table visible
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950/40">
          <table className="min-w-full border-collapse text-xs text-neutral-200">
            <thead className="bg-neutral-900/80 text-[11px] uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="border-b border-neutral-800 px-3 py-2 text-left font-medium">
                  Type
                </th>
                <th className="border-b border-neutral-800 px-3 py-2 text-right font-medium">
                  Maximum Number Of Seats
                </th>
                <th className="border-b border-neutral-800 px-3 py-2 text-right font-medium">
                  Min cargo vol (m³)
                </th>
                <th className="border-b border-neutral-800 px-3 py-2 text-right font-medium">
                  Min cargo wt (kg)
                </th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((vt) => (
                <tr
                  key={vt.VehicleTypeId}
                  className="odd:bg-neutral-900/40 even:bg-neutral-900/20"
                >
                  <td className="border-b border-neutral-900 px-3 py-1.5 text-left">
                    {vt.Name}
                  </td>
                  <td className="border-b border-neutral-900 px-3 py-1.5 text-right">
                    {vt.NumOfSeats}
                  </td>
                  <td className="border-b border-neutral-900 px-3 py-1.5 text-right">
                    {Number(vt.MinCargoVolume).toFixed(2)}
                  </td>
                  <td className="border-b border-neutral-900 px-3 py-1.5 text-right">
                    {Number(vt.MinCargoWeight).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
