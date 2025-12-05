import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";
import { Car, ArrowLeft, User, Briefcase } from "lucide-react";

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
        'Passenger': 'P',
        'Driver': 'D',
        'Company Representative': 'C'
      };

      // Map gender to single character
      const genderMap: { [key: string]: string } = {
        Male: "M",
        Female: "F",
        Other: "M", // Default to M for other options
        "Prefer not to say": "M",
      };

      const accountType = (formData.role === 'Company Representative') ? 'staff' : 'user';
      const sqlRole = roleMap[formData.role];

      const response = await signup({
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

      if (response.success) {
        toast.success("Account created successfully!");
        
        // Redirect based on role
        if (formData.role === "Driver") {
          toast.info("Please upload your driver documents for verification");
          navigate("/driver/documents", { state: { role: "driver", userId: response.userId } });
        } else if (formData.role === "Company Representative") {
          toast.info("Please upload your company documents for verification");
          navigate("/driver/documents", { state: { role: "company_representative", userId: response.userId } });
        } else {
          toast.success("You can now log in!");
          navigate("/login");
        }
      } else {
        throw new Error(response.message || "Signup failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 py-12">
          {/* Back button */}
          <Button
            variant="ghost"
            className="mb-4 -ml-2 text-gray-600 hover:text-gray-900"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">
              Create your account
            </h1>
            <p className="text-lg text-gray-600">
              Join OSRH and start your journey
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: "Passenger" })}
              className={`p-6 rounded-xl border-2 transition-all ${
                formData.role === "Passenger"
                  ? "border-black bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <User className="h-8 w-8 mb-3 mx-auto" />
              <p className="font-semibold text-gray-900">Passenger</p>
              <p className="text-xs text-gray-600 mt-1">Book rides</p>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: "Driver" })}
              className={`p-6 rounded-xl border-2 transition-all ${
                formData.role === "Driver"
                  ? "border-black bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Car className="h-8 w-8 mb-3 mx-auto" />
              <p className="font-semibold text-gray-900">Driver</p>
              <p className="text-xs text-gray-600 mt-1">Earn money</p>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-900">
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
                  className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-900">
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
                  className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* DOB & Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob" className="text-sm font-medium text-gray-900">
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
                  className="h-11 bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm font-medium text-gray-900">
                  Gender
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <SelectTrigger className="h-11 bg-gray-50 border-gray-200 text-gray-900">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
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
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">
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
                className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-900">
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+357 99 123456"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-gray-900">
                Address
              </Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main St, Nicosia, Cyprus"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
                className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-900">
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
                className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 bg-black text-white hover:bg-gray-800 text-base font-medium mt-2"
              disabled={loading || !formData.role}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center pt-4">
            <span className="text-gray-600">Already have an account? </span>
            <Button
              variant="link"
              className="p-0 h-auto text-black hover:text-black-700 font-medium"
              onClick={() => navigate("/login")}
            >
              Log in
            </Button>
          </div>
        </div>
      </div>

      {/* Right side - Brand */}
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
            Start your journey with OSRH
          </h2>
          <p className="text-xl text-gray-300">
            Whether you're riding or driving, we've got you covered.
          </p>
        </div>
      </div>
    </div>
  );
}
