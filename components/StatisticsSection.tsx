"use client";

import { useEffect, useState } from "react";

interface Statistics {
  totalReports: number;
  resolvedReports: number;
  inProgressReports: number;
}

export function StatisticsSection() {
  const [stats, setStats] = useState<Statistics>({
    totalReports: 0,
    resolvedReports: 0,
    inProgressReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/statistics");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Community Impact
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how our community is making a difference
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="text-center p-8 bg-white rounded-xl shadow-lg"
            >
              <div className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Community Impact
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          See how our community is making a difference
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {stats.totalReports.toLocaleString()}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Total Reports
          </h3>
          <p className="text-gray-600">Issues reported by community members</p>
        </div>

        <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {stats.resolvedReports.toLocaleString()}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Resolved</h3>
          <p className="text-gray-600">Issues successfully fixed</p>
        </div>

        <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {stats.inProgressReports.toLocaleString()}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            In Progress
          </h3>
          <p className="text-gray-600">Issues being worked on</p>
        </div>
      </div>
    </section>
  );
}
