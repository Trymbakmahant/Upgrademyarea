"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";

export default function MunicipalLogin() {
  const [municipalId, setMunicipalId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!municipalId || !password) {
      toast.error("Please enter both Municipal ID and Password");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/municipal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          municipalId,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const data = await response.json();

      // Store municipal session in localStorage
      localStorage.setItem(
        "municipalSession",
        JSON.stringify({
          municipalId: data.municipalId,
          nagarNigam: data.nagarNigam,
          name: data.name,
          loginTime: new Date().toISOString(),
        })
      );

      toast.success("Login successful!");
      router.push("/municipal");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(
        `Login failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            UpgradeMyArea
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">
            Municipal Login
          </h1>
          <p className="text-gray-600">
            Access your municipal dashboard to manage civic reports
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Municipal ID
            </label>
            <input
              type="text"
              value={municipalId}
              onChange={(e) => setMunicipalId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your Municipal ID"
              required
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">
            Municipal Credentials:
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Ranchi:</strong> ID: ranchi2024, Pass: ranchi123
            </p>
            <p>
              <strong>Jamshedpur:</strong> ID: jamshedpur2024, Pass:
              jamshedpur123
            </p>
            <p>
              <strong>Dhanbad:</strong> ID: dhanbad2024, Pass: dhanbad123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
