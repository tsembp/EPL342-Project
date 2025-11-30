import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Car,
  Search,
  Loader2,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  LogOut
} from "lucide-react";
import {
  searchVehiclesByPlate,
  getInspectorVehicleTestsPaged,
  createInspectorVehicleTest,
  type InspectorVehicleSummary,
  type InspectorVehicleTestRow,
  type PagedResult,
} from "@/features/inspector/api";
import { toast } from "sonner";
import { logout } from "@/features/auth/api";
import { useAuthStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";

type TestStatus = "valid" | "expiring" | "expired";

function getTestStatus(row: InspectorVehicleTestRow): TestStatus {
  const now = new Date();
  const expiry = new Date(row.ExpiryDate);

  if (expiry < now) return "expired";

  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 30) return "expiring";
  return "valid";
}

function formatDate(value: string) {
  const d = new Date(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function daysLeft(row: InspectorVehicleTestRow) {
  const now = new Date();
  const expiry = new Date(row.ExpiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

function statusBadge(status: TestStatus) {
  switch (status) {
    case "valid":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Valid
        </Badge>
      );
    case "expiring":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-500/10 text-amber-300"
        >
          <AlertTriangle className="mr-1 h-3 w-3" />
          Expiring soon
        </Badge>
      );
    case "expired":
      return (
        <Badge
          variant="outline"
          className="border-red-500/40 bg-red-500/10 text-red-300"
        >
          <AlertTriangle className="mr-1 h-3 w-3" />
          Expired
        </Badge>
      );
  }
}

export function InspectorDashboard() {

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const queryClient = useQueryClient();

  // LEFT SIDE – create test
  const [createTab, setCreateTab] = useState<"search" | "selected">("search");
  const [plateQuery, setPlateQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] =
    useState<InspectorVehicleSummary | null>(null);
  const [comments, setComments] = useState("");

  // RIGHT SIDE – tests list + pagination + status filter
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "upcoming" | "expiring" | "expired"
  >("all");

  const [testsPlateFilter, setTestsPlateFilter] = useState("");

  const {
    mutate: runSearch,
    data: searchResults = [],
    isPending: searching,
  } = useMutation({
    mutationFn: (q: string) => searchVehiclesByPlate(q.trim()),
    onError: (err: any) => {
      console.error(err);
      toast.error("Failed to search vehicles. Please try again.");
    },
  });

  const handleSearch = () => {
    const q = plateQuery.trim();
    setSearchTerm(q);
    if (!q) {
      toast.error("Please enter a plate number to search.");
      return;
    }
    runSearch(q);
  };

  const handleSelectVehicle = (v: InspectorVehicleSummary) => {
    setSelectedVehicle(v);
    setCreateTab("selected");
    setPage(1); // reset pagination to first page for this vehicle
  };

  const handleClearVehicle = () => {
    setSelectedVehicle(null);
    setCreateTab("search");
    setComments("");
    setPage(1);
  };

  const {
    mutate: createTest,
    isPending: creating,
  } = useMutation({
    mutationFn: (payload: { vehicleId: string; comments?: string }) =>
      createInspectorVehicleTest(payload),
    onSuccess: () => {
      toast.success("Vehicle test created successfully.");
      setComments("");
      // refresh tests list
      queryClient.invalidateQueries({
        queryKey: ["inspector", "vehicle-tests", { page, pageSize, vehicleId: selectedVehicle?.VehicleId ?? null }],
      });
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(
        err?.message || "Failed to create vehicle test. Please try again.",
      );
    },
  });

  const handleCreate = () => {
    if (!selectedVehicle) {
      toast.error("Please select a vehicle first.");
      return;
    }
    createTest({
      vehicleId: selectedVehicle.VehicleId,
      comments: comments.trim() || undefined,
    });
  };

  const {
    data: testsPage,
    isLoading: testsLoading,
    isFetching: testsFetching,
    isError: testsError,
    error: testsErrorObj,
    refetch: refetchTests,
  } = useQuery<PagedResult<InspectorVehicleTestRow>, Error>({
    queryKey: ["inspector", "vehicle-tests", { page, pageSize }],
    queryFn: () =>
      getInspectorVehicleTestsPaged({
        page,
        pageSize,
      }),
  });

  // Reset page when selected vehicle changes
  useEffect(() => {
    setPage(1);
  }, [selectedVehicle?.VehicleId]);

  const filteredTests = useMemo(() => {
    const items = testsPage?.items ?? [];
    const plateSearch = testsPlateFilter.trim().toLowerCase();

    return items.filter((t) => {
      // 👇 Plate / vehicle filter
      if (plateSearch) {
        const matchesPlate =
          t.PlateNumber.toLowerCase().includes(plateSearch) ||
          `${t.Brand} ${t.Model}`.toLowerCase().includes(plateSearch);
        if (!matchesPlate) return false;
      }

      // 👇 Status filter (same as before)
      const status = getTestStatus(t);
      if (statusFilter === "all") return true;
      if (statusFilter === "upcoming")
        return status === "valid" || status === "expiring";
      if (statusFilter === "expiring") return status === "expiring";
      if (statusFilter === "expired") return status === "expired";
      return true;
    });
  }, [testsPage, statusFilter, testsPlateFilter]);

  const stats = useMemo(() => {
    const items = testsPage?.items ?? [];
    const total = items.length;
    let valid = 0;
    let expiring = 0;
    let expired = 0;

    for (const t of items) {
      const s = getTestStatus(t);
      if (s === "valid") valid++;
      else if (s === "expiring") expiring++;
      else expired++;
    }

    return { total, valid, expiring, expired };
  }, [testsPage]);

  const totalCount = testsPage?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-50">
      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-neutral-900 bg-neutral-950 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">
            OSRH | Inspector Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          {testsFetching && (
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing…
            </span>
          )}
          <button
            onClick={handleLogout}
            className="
              flex items-center gap-1 px-4 py-2 rounded-xl text-sm
              text-red-400
              transition-all duration-150

              hover:bg-red-900/20
              hover:text-red-300
              hover:border-red-700
            "
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <section className="flex flex-1 flex-col gap-4 px-4 pb-10 pt-6 lg:px-8 lg:pt-8 lg:flex-row">
        {/* LEFT PANEL: search + create test */}
        <div className="w-full lg:w-96">
          <Card className="h-full border-neutral-800 bg-neutral-900/80 p-4 lg:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-neutral-50">
                  Create vehicle test
                </p>
                <p className="text-xs text-neutral-400">
                  Search a vehicle by plate, select it, then record a new test.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-900 p-2">
              </div>
            </div>

            <div className="mt-4">
              <Tabs
                value={createTab}
                onValueChange={(v) =>
                  setCreateTab(v as "search" | "selected")
                }
              >
                {/* SEARCH TAB */}
                <TabsContent value="search" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-200">
                      Plate number
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                        <Input
                          className="border-neutral-800 bg-neutral-900 pl-9 text-sm text-neutral-50 placeholder:text-neutral-500"
                          placeholder="e.g. KNP 342"
                          value={plateQuery}
                          onChange={(e) => setPlateQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearch();
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        className="border-sky-500/40 bg-sky-600 text-xs text-white hover:bg-sky-500"
                        onClick={handleSearch}
                        disabled={searching}
                      >
                        {searching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Search"
                        )}
                      </Button>
                    </div>
                    {searchTerm && (
                      <p className="text-[11px] text-neutral-500">
                        Results for:{" "}
                        <span className="font-mono text-neutral-300">
                          {searchTerm}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-neutral-200">
                      Results
                    </p>
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950/60 p-2">
                      {searching && (
                        <div className="flex items-center justify-center py-6 text-xs text-neutral-400">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Searching vehicles…
                        </div>
                      )}

                      {!searching && searchResults.length === 0 && (
                        <div className="py-6 text-center text-xs text-neutral-500">
                          No vehicles found. Try a different plate.
                        </div>
                      )}

                      {searchResults.map((v) => (
                        <button
                          key={v.VehicleId}
                          type="button"
                          onClick={() => handleSelectVehicle(v)}
                          className="flex w-full items-center justify-between rounded-md bg-neutral-900/60 px-2 py-2 text-left text-xs hover:bg-neutral-800"
                        >
                          <div>
                            <p className="text-neutral-100">
                              {v.Brand} {v.Model}
                            </p>
                            <p className="text-[11px] text-neutral-400">
                              Plate:{" "}
                              <span className="font-mono text-neutral-200">
                                {v.PlateNumber}
                              </span>{" "}
                              · Color: {v.Color}
                            </p>
                          </div>
                          <Badge className="bg-neutral-950 font-mono text-[10px]">
                            Select
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* SELECTED VEHICLE TAB */}
                <TabsContent value="selected" className="mt-4 space-y-4">
                  {!selectedVehicle ? (
                    <Card className="border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-400">
                      No vehicle selected yet. Use the{" "}
                      <span className="font-semibold text-neutral-200">
                        Search vehicle
                      </span>{" "}
                      tab to find and select a vehicle.
                    </Card>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 rounded-lg bg-neutral-950/70 p-3">
                        <div className="space-y-1 text-xs">
                          <p className="text-neutral-300">
                            <span className="font-medium">
                              {selectedVehicle.Brand} {selectedVehicle.Model}
                            </span>
                          </p>
                          <p className="text-neutral-400">
                            Plate:{" "}
                            <span className="font-mono text-neutral-200">
                              {selectedVehicle.PlateNumber}
                            </span>
                          </p>
                          <p className="text-neutral-400">
                            Color:{" "}
                            <span className="text-neutral-200">
                              {selectedVehicle.Color}
                            </span>
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="xs"
                          className="border-neutral-700 bg-neutral-900 text-[11px] text-neutral-300 hover:bg-neutral-800"
                          onClick={handleClearVehicle}
                        >
                          Clear
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-200">
                          Test comments
                        </label>
                        <Textarea
                          className="min-h-[140px] border-neutral-800 bg-neutral-900 text-sm text-neutral-50 placeholder:text-neutral-500"
                          placeholder="Describe the inspection findings (e.g. brakes, tyres, rust, software updates)…"
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                        />
                        <p className="text-[11px] text-neutral-500">
                          A new test record will be created with today&apos;s
                          check date and expiry one year from now.
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="border-sky-500/40 bg-sky-600 text-xs text-white hover:bg-sky-500"
                          onClick={handleCreate}
                          disabled={creating}
                        >
                          {creating ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Creating…
                            </>
                          ) : (
                            "Create test"
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL: tests with pagination */}
        <div className="flex-1 space-y-4">
          {/* Summary for current page / filter */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-neutral-800 bg-neutral-900/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Tests (page)
                  </p>
                    <p className="mt-1 text-2xl font-semibold text-neutral-200">
                    {stats.total.toString()}
                    </p>
                </div>
                <div className="rounded-xl bg-neutral-800 p-2">
                  <Car className="h-5 w-5 text-neutral-200" />
                </div>
              </div>
            </Card>

            <Card className="border-neutral-800 bg-neutral-900/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Valid
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-300">
                    {stats.valid.toString()}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                </div>
              </div>
            </Card>

            <Card className="border-neutral-800 bg-neutral-900/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Expiring
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-amber-300">
                    {stats.expiring.toString()}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-500/10 p-2">
                  <AlertTriangle className="h-5 w-5 text-amber-300" />
                </div>
              </div>
            </Card>

            <Card className="border-neutral-800 bg-neutral-900/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Expired
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-red-300">
                    {stats.expired.toString()}
                  </p>
                </div>
                <div className="rounded-xl bg-red-500/10 p-2">
                  <AlertTriangle className="h-5 w-5 text-red-300" />
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-neutral-800 bg-neutral-900/80 p-4 lg:p-5">
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-100">
                    Past tests
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                {/* Status filter */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-neutral-400">
                    <ListFilter className="h-3 w-3" />
                    <span>Status:</span>
                  </div>
                  <Tabs
                    value={statusFilter}
                    onValueChange={(v) =>
                      setStatusFilter(
                        v as "all" | "upcoming" | "expiring" | "expired",
                      )
                    }
                  >
                    <TabsList className="bg-neutral-900/60">
                      <TabsTrigger
                        value="all"
                        className="px-2 text-[11px] data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50"
                      >
                        All
                      </TabsTrigger>
                      <TabsTrigger
                        value="upcoming"
                        className="px-2 text-[11px] data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50"
                      >
                        Upcoming
                      </TabsTrigger>
                      <TabsTrigger
                        value="expiring"
                        className="px-2 text-[11px] data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50"
                      >
                        Expiring
                      </TabsTrigger>
                      <TabsTrigger
                        value="expired"
                        className="px-2 text-[11px] data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50"
                      >
                        Expired
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Plate filter for tests */}
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 w-40 border-neutral-800 bg-neutral-900 text-xs text-neutral-50 placeholder:text-neutral-500"
                    placeholder="Filter by plate..."
                    value={testsPlateFilter}
                    onChange={(e) => setTestsPlateFilter(e.target.value)}
                  />
                  {testsPlateFilter && (
                    <Button
                      variant="outline"
                      size="xs"
                      className="border-neutral-700 bg-neutral-900 text-[11px] text-neutral-200 hover:bg-neutral-800"
                      onClick={() => setTestsPlateFilter("")}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Tests list */}
            {testsLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-neutral-300">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading tests…
              </div>
            ) : testsError ? (
              <div className="rounded-lg border border-red-900/60 bg-red-950/60 px-3 py-4 text-xs text-red-200">
                <p className="font-medium">Failed to load tests.</p>
                <p className="mt-1 text-red-300/80">
                  {testsErrorObj instanceof Error
                    ? testsErrorObj.message
                    : "Unknown error"}
                </p>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-neutral-800 bg-neutral-950/60 px-4 py-10 text-center">
                <div>
                  <CalendarClock className="mx-auto mb-3 h-7 w-7 text-neutral-500" />
                  <p className="text-sm font-medium text-neutral-200">
                    No tests found on this page
                  </p>
                  <p className="text-xs text-neutral-400">
                    Try changing the status filter or navigating to another page.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTests.map((t) => {
                  const status = getTestStatus(t);
                  const dLeft = daysLeft(t);

                  return (
                    <Card
                      key={t.TestId}
                      className="border-neutral-800 bg-neutral-950/80 p-4 transition-colors hover:border-neutral-700"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex flex-1 gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold tracking-tight text-white">
                                {t.Brand} {t.Model}
                              </span>
                              <Badge className="bg-neutral-900 text-xs font-mono">
                                {t.PlateNumber}
                              </Badge>
                              {statusBadge(status)}
                            </div>
                            <p className="text-xs text-neutral-400">
                              Color:{" "}
                              <span className="text-neutral-200">
                                {t.Color}
                              </span>
                            </p>
                            <p className="text-xs text-neutral-400">
                              Comments:{" "}
                              <span className="text-neutral-200">
                                {t.Comments}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 text-right text-xs text-neutral-300">
                          <div className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3 text-neutral-500" />
                            <span>Checked: {formatDate(t.CheckDate)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-neutral-400">
                            <CalendarClock className="h-3 w-3 text-neutral-500" />
                            <span>Expires: {formatDate(t.ExpiryDate)}</span>
                          </div>
                          {status !== "expired" && (
                            <span className="mt-1 text-[11px] text-neutral-400">
                              {dLeft > 0 ? `${dLeft} days left` : "Expires today"}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination controls */}
            <div className="mt-4 flex items-center justify-between border-t border-neutral-800 pt-3 text-xs text-neutral-400">
              <div>
                Page{" "}
                <span className="font-semibold text-neutral-100">
                  {page}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-neutral-100">
                  {totalPages}
                </span>{" "}
                · {totalCount} tests total
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-neutral-700 bg-neutral-900 text-[11px] text-neutral-200 hover:bg-neutral-800"
                  onClick={() => canPrev && setPage((p) => p - 1)}
                  disabled={!canPrev}
                >
                  <ChevronLeft className="mr-1 h-3 w-3" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-neutral-700 bg-neutral-900 text-[11px] text-neutral-200 hover:bg-neutral-800"
                  onClick={() => canNext && setPage((p) => p + 1)}
                  disabled={!canNext}
                >
                  Next
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

export default InspectorDashboard;
