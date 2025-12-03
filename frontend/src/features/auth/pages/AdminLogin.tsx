import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { adminLogin } from "@/features/auth/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await adminLogin({ email, password });

      if (response.success) {
        toast.success("Admin login successful");
        await useAuthStore.getState().checkAuth();

        const role = useAuthStore.getState().userRole;
        navigate("/admin");
      } else {
        throw new Error(response.error || "Login failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-gray-200 bg-white mb-4 shadow-sm">
            <ShieldCheck className="h-8 w-8 text-black" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Admin Login
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Sign in as Admin, Operator or Inspector
          </p>
        </div>

        {/* Card */}
        <Card className="border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wide text-gray-700"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-500 focus-visible:ring-offset-0"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wide text-gray-700"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-500 focus-visible:ring-offset-0"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="mt-2 w-full h-11 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Not Admin? </span>
            <Button
              variant="link"
              className="p-0 h-auto text-gray-900 hover:text-black"
              onClick={() => navigate("/login")}
            >
              Login as User
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}