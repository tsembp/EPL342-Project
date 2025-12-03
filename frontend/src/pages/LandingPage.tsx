import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Car, Shield, Clock, MapPin, Users, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useEffect } from "react";

export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      // Redirect authenticated users to their appropriate dashboard
      const role = useAuthStore.getState().userRole;
      if (role === "operator") {
        navigate("/operator/overview");
      } else if (role === "inspector") {
        navigate("/inspector");
      } else if (role === "admin") {
        navigate("/admin");
      } else if (role === "driver" || role === "company_representative") {
        navigate("/driver");
      } else {
        navigate("/passenger/ride");
      }
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
                <Car className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">OSRH</span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center space-x-8">
              <button className="text-sm font-medium text-gray-700 hover:text-gray-900">
                Ride
              </button>
              <button className="text-sm font-medium text-gray-700 hover:text-gray-900">
                Drive
              </button>
              <button className="text-sm font-medium text-gray-700 hover:text-gray-900">
                About
              </button>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                className="text-sm font-medium"
                onClick={() => navigate("/login")}
              >
                Log in
              </Button>
              <Button
                className="bg-black text-white hover:bg-gray-800 text-sm font-medium h-10 px-5"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                  Go anywhere with OSRH
                </h1>
                <p className="text-xl text-gray-600">
                  Request a ride, hop in, and go. Or become a driver and earn on your schedule.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-black text-white hover:bg-gray-800 h-14 px-8 text-base font-medium"
                  onClick={() => navigate("/signup")}
                >
                  Get started
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-base font-medium border-2 border-gray-300 hover:bg-gray-50"
                  onClick={() => navigate("/login")}
                >
                  Already have an account?
                </Button>
              </div>
            </div>

            {/* Right Image Placeholder */}
            <div className="relative h-[500px] bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <Car className="h-32 w-32 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why choose OSRH?
            </h2>
            <p className="text-xl text-gray-600">
              Experience the best ride-sharing platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-6">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Fast & Reliable
              </h3>
              <p className="text-gray-600">
                Get picked up quickly and arrive at your destination on time, every time.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Safety First
              </h3>
              <p className="text-gray-600">
                All drivers are verified and background checked for your peace of mind.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-6">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Wide Coverage
              </h3>
              <p className="text-gray-600">
                Available across Cyprus with comprehensive zone coverage for all your travel needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Driver CTA Section */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Image Placeholder */}
            <div className="relative h-[400px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="h-32 w-32 text-gray-600" />
              </div>
            </div>

            {/* Right Content */}
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Drive when you want, make what you need
              </h2>
              <p className="text-xl text-gray-300">
                Set your own schedule and earn money by driving on the OSRH platform.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <ChevronRight className="h-6 w-6 mr-2 flex-shrink-0" />
                  <span>Flexible hours that work for you</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-6 w-6 mr-2 flex-shrink-0" />
                  <span>Competitive earnings and weekly payouts</span>
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-6 w-6 mr-2 flex-shrink-0" />
                  <span>Support and resources when you need them</span>
                </li>
              </ul>
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100 h-14 px-8 text-base font-medium mt-4"
                onClick={() => navigate("/signup")}
              >
                Start driving today
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Company */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><button className="hover:text-gray-900">About us</button></li>
                <li><button className="hover:text-gray-900">Our offerings</button></li>
                <li><button className="hover:text-gray-900">Newsroom</button></li>
              </ul>
            </div>

            {/* Products */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Products</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><button className="hover:text-gray-900">Ride</button></li>
                <li><button className="hover:text-gray-900">Drive</button></li>
                <li><button className="hover:text-gray-900">Business</button></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><button className="hover:text-gray-900">Help</button></li>
                <li><button className="hover:text-gray-900">Safety</button></li>
                <li><button className="hover:text-gray-900">Contact</button></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><button className="hover:text-gray-900">Terms</button></li>
                <li><button className="hover:text-gray-900">Privacy</button></li>
                <li><button className="hover:text-gray-900">GDPR</button></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                <Car className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">OSRH</span>
            </div>
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} OSRH. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
