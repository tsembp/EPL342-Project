import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, ShieldCheck, RefreshCw, User2, LogOut } from "lucide-react";
import { fetchAPI } from "@/lib/apiClient";
import { toast } from "sonner";
import { AdminBottomNav } from "@/features/admin/components/AdminBottomNav";
import { useAuthStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";

type PendingOperator = {
  userId: string;
  email: string;
  username: string;
  createdAt: string;
};

export default function AdminPendingOperatorsPage() {
  const [operators, setOperators] = useState<PendingOperator[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userRole, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };
  
  async function loadPendingOperators(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);

    try {
      setError(null);

      const res = await fetchAPI<{
        success: boolean;
        items?: PendingOperator[];
        error?: string;
      }>("/admin/operators/pending");

      if (!res.success || !res.items) {
        throw new Error(res.error || "Failed to load pending operators");
      }

      setOperators(res.items);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load pending operators");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    // Initial load (will be wired to API later)
    void loadPendingOperators(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (op: PendingOperator) => {
    console.log("Approve called with:", op); // <-- Add here
    try {
      const res = await fetchAPI<{ success: boolean; error?: string }>(
        `/admin/operators/${op.userId}/approve`,
        {
          method: "POST",
        }
      );

      if (!res.success) {
        console.error(res.error || "Failed to approve operator");
        toast.error(res.error || "Failed to approve operator");
        return;
      }

      // Remove from list
      setOperators((prev) => prev.filter((x) => x.userId !== op.userId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (op: PendingOperator) => {
    console.log("Reject called with:", op); // <-- Add here
    try {
      const res = await fetchAPI<{ success: boolean; error?: string }>(
        `/admin/operators/${op.userId}/reject`,
        {
          method: "POST",
        }
      );

      if (!res.success) {
        console.error(res.error || "Failed to reject operator");
        toast.error(res.error || "Failed to reject operator");
        return;
      }

      // Remove from list
      setOperators((prev) => prev.filter((x) => x.userId !== op.userId));
    } catch (err) {
      console.error(err);
    }
  };


  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">OSRH | Admin Dashboard</h1>
          <p className="mt-1 text-xs text-gray-600">
            Review and approve new <span className="font-semibold">Operator</span> accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="
              flex items-center gap-1 px-4 py-2 rounded-xl text-sm
              text-red-600
              transition-all duration-150

              hover:bg-red-50
              hover:text-red-700
            "
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
        <main className="flex flex-1 flex-col items-center px-4 py-6">
          <div className="w-full max-w-4xl">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                    <ShieldAlert className="h-4 w-4 text-gray-700" />
                    Pending Operator Approvals
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600">
                    Operators must be approved before they can access the operator console.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-gray-300 text-xs text-gray-700">
                    {operators.length} pending
                  </Badge>
                    <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                    onClick={() => loadPendingOperators(true)}
                    disabled={refreshing || loading}
                    >
                    {refreshing || loading ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-3 w-3" />
                    )}
                    <span className="text-gray-700">Refresh</span>
                    </Button>
                </div>
              </CardHeader>

              <CardContent className="pb-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                    <Loader2 className="mb-3 h-6 w-6 animate-spin" />
                    <p className="text-sm">Loading pending operators…</p>
                  </div>
                ) : error ? (
                  <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <p>{error}</p>
                  </div>
                ) : operators.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                    <ShieldCheck className="mb-2 h-7 w-7 text-gray-500" />
                    <p className="text-sm">No pending operators at the moment.</p>
                    <p className="mt-1 text-xs text-gray-500">
                      New operator sign-ups will appear here for review.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-100">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                            User
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                            Email
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                            Username
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                            Requested at
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {operators.map((op) => (
                          <tr
                            key={op.userId}
                            className="border-b border-gray-200 bg-white hover:bg-gray-50"
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                                  <User2 className="h-4 w-4 text-gray-700" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[11px] text-gray-600">
                                    {op.userId}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900">
                              {op.email}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900">
                              {op.username}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {op.createdAt}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 bg-red-50 text-[11px] text-red-600 hover:bg-red-100 hover:border-red-400"
                                  onClick={() => handleReject(op)}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-black text-white text-[11px] hover:bg-gray-800"
                                  onClick={() => handleApprove(op)}
                                >
                                  Approve
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
