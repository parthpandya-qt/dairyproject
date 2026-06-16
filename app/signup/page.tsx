"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to login page upon successful account creation
        router.push("/signin");
      } else {
        setError(data.error || "Failed to register admin account.");
      }
    } catch (err) {
      console.error("Sign up error:", err);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-green-100 via-white to-emerald-200 p-6">

    {/* Background Blobs */}
    <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-green-300/40 blur-3xl"></div>
    <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-emerald-400/40 blur-3xl"></div>

    <div className="w-full max-w-md relative z-10">
      <div className="backdrop-blur-xl bg-white/70 border border-white/40 shadow-2xl rounded-3xl p-8">

        {/* Header */}
        <div className="text-center mb-8">
          

          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            Dairy Farm
          </h1>

          <p className="text-gray-600 mt-2">
            Create your administrative account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="dairy_admin"
              required
              className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-black shadow-sm transition-all duration-200 focus:border-green-500 focus:ring-4 focus:ring-green-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@dairyfarm.com"
              required
              className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-black shadow-sm transition-all duration-200 focus:border-green-500 focus:ring-4 focus:ring-green-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-black shadow-sm transition-all duration-200 focus:border-green-500 focus:ring-4 focus:ring-green-200 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-green-300 disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-5">
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-semibold text-green-600 hover:text-green-700 transition"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  </div>
)
}