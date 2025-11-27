import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";
import { Car } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    dob: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Map UI role to SQL role codes
      const roleMap: { [key: string]: string } = {
        Passenger: "P",
        Driver: "D",
        Operator: "O",
        Inspector: "I",
      };

      // Map gender to single character
      const genderMap: { [key: string]: string } = {
        Male: "M",
        Female: "F",
        Other: "M", // Default to M for other options
        "Prefer not to say": "M",
      };

      const accountType =
        formData.role === "Operator" || formData.role === "Inspector"
          ? "staff"
          : "user";
      const sqlRole = roleMap[formData.role];

      await signup({
        accountType: accountType,
        role: sqlRole,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob,
        gender: genderMap[formData.gender],
        phone: formData.phone,
        address: formData.address,
      });

      toast.success("Account created successfully!");

      // Redirect based on role
      if (formData.role === "Driver") {
        toast.info("Please upload your driver documents for verification");
        navigate("/driver/documents");
      } else if (formData.role === "Operator" || formData.role === "Inspector") {
        toast.info("Your account needs admin approval");
        navigate("/pending-approval");
      } else {
        toast.success("You can now log in!");
        navigate("/login");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header / Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-neutral-800 bg-neutral-900 mb-4 shadow-lg">
            <Car className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Create account
          </h1>
          <p className="text-sm text-neutral-400 mt-2">
            Get started in seconds
          </p>
        </div>

        {/* Card */}
        <Card className="border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="firstName"
                  className="text-xs font-medium uppercase tracking-wide text-neutral-400"
                >
                  First Name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                  className="h-11 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="lastName"
                  className="text-xs font-medium uppercase tracking-wide text-neutral-400"
                >
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                  className="h-11 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label
                htmlFor="role"
                className="text-xs font-medium uppercase tracking-wide text-neutral-400"
              >
                Role
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger className="h-11 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 focus:ring-emerald-500 focus:ring-offset-0">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="border border-neutral-800 bg-neutral-900 text-neutral-50">
                  <SelectItem value="Passenger">Passenger</SelectItem>
                  <SelectItem value="Driver">Driver</SelectItem>
                  <SelectItem value="Operator">Operator</SelectItem>
                  <SelectItem value="Inspector">Inspector</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* DOB & Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="dob"
                  className="text-xs font-medium uppercase tracking-wide text-neutral-400"
                >
                  Date of Birth
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) =>
                    setFormData({ ...formData, dob: e.target.value })
                  }
                  required
                  className="h-11 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="gender"
                  className="text-xs font-medium uppercase tracking-wide text-neutral-400"
                >
                  Gender
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <SelectTrigger className="h-11 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 focus:ring-emerald-500 focus:ring-offset-0">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="border border-neutral-800 bg-neutral-900 text-neutral-50">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="Prefer not to say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="h-11 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-xs font-medium uppercase tracking-wide text-neutral-400"
              >
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                className="h-11 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label
                htmlFor="address"
                className="text-xs font-medium uppercase tracking-wide text-neutral-400"
              >
                Address
              </Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main St, City, Country"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
                className="h-11 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500 focus-visible:ring-emerald-500 focus-visible:ring-offset-0"
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-xs font-medium uppercase tracking-wide text-neutral-400"
              >
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
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
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
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
              {loading ? "Creating account..." : "Sign up"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm">
            <span className="text-neutral-500">Already have an account? </span>
            <Button
              variant="link"
              className="p-0 h-auto text-emerald-400 hover:text-emerald-300"
              onClick={() => navigate("/login")}
            >
              Sign in
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
