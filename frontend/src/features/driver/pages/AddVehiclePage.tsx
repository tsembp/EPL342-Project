import { useState } from "react";
import { useNavigate } from "react-router-dom";
// import { useQuery } from "@tanstack/react-query"; // Removed for hardcoding vehicle types
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Car } from "lucide-react";
import { addVehicle } from "@/features/driver/api";
import { fetchAPI } from "@/lib/apiClient"; // Keep fetchAPI for now as it's part of the original context

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

// Hardcoded vehicle types as requested by the user
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
  { vehicleTypeId: 10, type: "Sedan", description: "Sedan car" },
  { vehicleTypeId: 11, type: "Sports Car", description: "Sports car" },
  { vehicleTypeId: 12, type: "SUV", description: "SUV" },
  { vehicleTypeId: 13, type: "Truck", description: "Truck" },
  { vehicleTypeId: 14, type: "Van", description: "Van" },
  { vehicleTypeId: 15, type: "Wagon", description: "Wagon car" },
];

// getVehicleTypes function is no longer needed since types are hardcoded
// const getVehicleTypes = async (): Promise<VehicleType[]> => {
//   const response = await fetchAPI<VehicleType[]>("/driver/vehicle-types");
//   return response;
// };

export default function AddVehiclePage() {
  const navigate = useNavigate();

  const [plateNumber, setPlateNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [seats, setSeats] = useState<number | string>("");
  const [cargoVolume, setCargoVolume] = useState<number | string>("");
  const [cargoWeight, setCargoWeight] = useState<number | string>("");
  const [vehicleTypeId, setVehicleTypeId] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Directly use hardcoded vehicle types
  const vehicleTypes = HARDCODED_VEHICLE_TYPES;
  const isLoadingVehicleTypes = false; // No longer loading from API

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!vehicleTypeId || !plateNumber || !brand || !model || !color || !seats) {
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
      <Card className="mx-auto max-w-2xl border border-neutral-800 bg-neutral-900/80 p-5 sm:p-6">
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
            {isLoadingVehicleTypes ? (
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading vehicle types…
              </div>
            ) : (
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
            )}
            {vehicleTypes && vehicleTypes.length > 0 && (
              <p className="text-[11px] text-neutral-500">
                Different vehicle types may unlock different service categories.
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
              <option key={b} value={b}>{b}</option>
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

          {/* Submit */}
          <div className="md:col-span-2 pt-2">
            <Button
              type="submit"
              className="flex w-full items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
              disabled={isSubmitting || isLoadingVehicleTypes}
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
    </div>
  );
}
