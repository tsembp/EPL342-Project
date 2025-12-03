import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";
import { Car, ArrowLeft } from "lucide-react";

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
      const response = await login(email, password);

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
          }
          else if (role === "driver" || role === "company_representative") {
            navigate("/driver"); 
          } else {
            navigate("/passenger/ride");
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
    <div className="min-h-screen bg-white flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Back button */}
          <Button
            variant="ghost"
            className="mb-8 -ml-2 text-gray-600 hover:text-gray-900"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">
              Welcome back
            </h1>
            <p className="text-lg text-gray-600">
              Log in to your OSRH account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-black text-white hover:bg-gray-800 text-base font-medium"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center pt-4">
            <span className="text-gray-600">Don't have an account? </span>
            <Button
              variant="link"
              className="p-0 h-auto text-black hover:text-gray-700 font-medium"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </Button>
          </div>

          {/* Admin login */}
          <div className="text-center pt-2">
            <Button
              variant="link"
              className="p-0 h-auto text-sm text-gray-500 hover:text-gray-700"
              onClick={() => navigate("/admin/login")}
            >
              Staff login
            </Button>
          </div>
        </div>
      </div>

      {/* Right side - Image/Brand */}
      <div className="hidden lg:flex lg:flex-1 bg-black items-center justify-center p-12 relative overflow-hidden">
        {/* Background video with low opacity */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        >
          <source src="/background-video.mp4" type="video/mp4" />
        </video>
        
        {/* Content overlay */}
        <div className="max-w-md text-center space-y-6 relative z-10">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto">
            <Car className="h-10 w-10 text-black" />
          </div>
          <h2 className="text-4xl font-bold text-white">
            Your journey starts here
          </h2>
          <p className="text-xl text-gray-300">
            Access your account to book rides or start earning as a driver.
          </p>
        </div>
      </div>
    </div>
  );
}
