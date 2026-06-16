"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Force Next.js to refresh server components layout cache, then redirect
        router.push("/admin/");
        router.refresh(); 
      } else {
        setError(data.error || "Invalid email or password.");
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Failed to connect to the authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-white to-emerald-200 p-6">
    <div className="w-full max-w-md">
      <div className="backdrop-blur-xl bg-white/70 border border-white/40 shadow-2xl rounded-3xl p-8">
        
        <div className="text-center mb-8">
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            Dairy Farm
          </h1>
          <p className="text-gray-600 mt-2">
            Manage customers, products & operations
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-black shadow-sm transition-all duration-200 focus:border-green-500 focus:ring-4 focus:ring-green-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
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
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 border-t border-gray-200 pt-5">
          <p className="text-center text-sm text-gray-600">
            New system deployment?{" "}
            <Link
              href="/signup"
              className="font-semibold text-green-600 hover:text-green-700 transition"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  </div>
)
};