import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";

// Simple car animation component
function CarLoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-32 h-16">
        <div className="absolute left-0 top-1/2 animate-car-move">
          <Car className="w-16 h-16 text-emerald-500" />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-neutral-700 to-neutral-900 rounded-full" />
      </div>
      <div className="mt-4 text-neutral-400 text-sm">Calculating possible routes...</div>
      <style>{`
        @keyframes car-move {
          0% { left: 0; }
          100% { left: 8rem; }
        }
        .animate-car-move {
          animation: car-move 2s linear infinite alternate;
        }
      `}</style>
    </div>
  );
}

export default function RideAlternativesPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAlternatives() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/passenger/ride-requests/${requestId}/alternatives`, {
          credentials: "include",
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.alternatives)) {
          setAlternatives(data.alternatives);
        } else {
          setError(data.error || "No alternatives found.");
        }
      } catch (err) {
        setError("Failed to fetch alternatives.");
      } finally {
        setLoading(false);
      }
    }
    fetchAlternatives();
  }, [requestId]);

  return (
  <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-neutral-50 px-4 pt-12 pb-12">
      <Card className="w-full max-w-2xl p-8 border border-neutral-800 bg-neutral-900/80 shadow-lg mt-4">
        <h2 className="text-2xl font-bold mb-4 text-emerald-400 drop-shadow">Choose Your Route</h2>
        {loading ? (
          <CarLoadingAnimation />
        ) : error ? (
          <div className="text-red-400 text-center py-8">{error}</div>
        ) : alternatives.length === 0 ? (
          <div className="text-neutral-400 text-center py-8">No alternative routes found.</div>
        ) : (
          <div className="grid gap-6">
            {alternatives.map((alt, idx) => (
              <div
                key={idx}
                className={`border rounded-xl p-5 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 transition cursor-pointer hover:border-emerald-400 hover:shadow-emerald-900/30 ${selectedIdx === idx ? "border-emerald-500 shadow-lg" : "border-neutral-700"}`}
                onClick={() => setSelectedIdx(idx)}
                tabIndex={0}
                role="button"
                aria-pressed={selectedIdx === idx}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={selectedIdx === idx ? "default" : "outline"} className={selectedIdx === idx ? "bg-emerald-500 text-neutral-950" : "bg-neutral-800 text-neutral-200"}>
                    Alternative {idx + 1}
                  </Badge>
                  {selectedIdx === idx && (
                    <span className="text-emerald-400 font-bold ml-2 text-base">Selected</span>
                  )}
                </div>
                <div className="text-base text-neutral-100">
                  {/* Always show summary of route: zone IDs and sequence numbers */}
                  {alt.legs && Array.isArray(alt.legs) ? (
                    <>
                      <ul className="list-disc ml-6">
                        {alt.legs.map((leg: any, legIdx: number) => (
                          <li key={legIdx} className="mb-1">
                            <span className="font-semibold text-emerald-300">Seq {leg.seqNo}:</span>
                            <span className="mx-2 text-neutral-400">Zone {leg.fromZoneId}</span>
                            <span className="mx-2 text-neutral-400">→</span>
                            <span className="font-semibold text-emerald-300">Zone {leg.toZoneId}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-neutral-500 italic">
                        Map visualization coming soon.
                      </div>
                    </>
                  ) : (
                    <span className="text-neutral-400">No legs info available.</span>
                  )}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="outline"
                    className={`group border-emerald-500 text-emerald-500 font-bold px-5 py-2 rounded-lg transition-all duration-300 ease-in-out ${selectedIdx === idx ? "hover:bg-emerald-500 hover:text-neutral-950 hover:shadow-lg" : "opacity-70"}`}
                    disabled={selectedIdx !== idx}
                    onClick={e => {
                      e.stopPropagation();
                      if (selectedIdx === idx) {
                        // TODO: Replace with navigation to next page, passing selected alternative
                        alert(`Selected alternative ${idx + 1}`);
                        // Example: navigate(`/ride-confirm/${alt.id}`);
                      }
                    }}
                  >
                    Select Route <span className="inline-block transition-transform duration-300 ease-in-out group-hover:translate-x-2">&rarr;</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
