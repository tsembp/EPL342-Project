import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";
import { Car } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(email, password); // Capture the full response

      if (response.success) {
        toast.success("Logged in successfully");

        if (response.verificationStatus === "DOCS_PENDING") {
          navigate("/driver/documents");
        } else if (response.verificationStatus === "PENDING_APPROVAL") {
          navigate("/driver/pending-approval");
        } else { 
          const role = useAuthStore.getState().userRole;
          if (role === "operator") {
            navigate("/operator/overview");
          } else if (role === "inspector") {
            navigate("/inspector");
          } else if (role === "admin") {
            navigate("/admin");
          } else if (role === "driver") {
            navigate("/driver"); 
          } else { 
            navigate("/passenger/ride");;
          }
        }
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
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-neutral-800 bg-neutral-900 mb-4 shadow-lg">
            <Car className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-neutral-400 mt-2">
            Sign in to continue your ride
          </p>
        </div>

        {/* Card */}
        <Card className="border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wide text-neutral-400"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wide text-neutral-400"
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
                className="h-11 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="mt-2 w-full h-11 rounded-xl bg-emerald-500 text-neutral-950 text-sm font-medium hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm">
            <span className="text-neutral-500">Don&apos;t have an account? </span>
            <Button
              variant="link"
              className="p-0 h-auto text-emerald-400 hover:text-emerald-300"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </Button>
          </div>
        </Card>
      </div>

      {/* Bottom right: Login as Staff */}
      <div className="absolute bottom-4 right-4 text-[0.7rem] text-neutral-500">
        <Button
          variant="link"
          className="p-0 h-auto text-neutral-400 hover:text-emerald-400 text-[0.7rem]"
          onClick={() => navigate("/admin/login")}
        >
          Login as Admin
        </Button>
      </div>
    </div>
  );
}
