"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Navigation() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-indigo-600">
              UpgradeMyArea
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/report"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Report Issue
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              My Reports
            </Link>
            <Link
              href="/auth/municipal"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Municipal Login
            </Link>

            {status === "loading" ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Image
                    src={session.user?.image || ""}
                    alt={session.user?.name || ""}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm text-gray-700 hidden sm:block">
                    {session.user?.name}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="space-y-3">
              <Link
                href="/report"
                className="block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Report Issue
              </Link>
              <Link
                href="/dashboard"
                className="block text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                My Reports
              </Link>
              <Link
                href="/auth/municipal"
                className="block text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Municipal Login
              </Link>

              {status === "loading" ? (
                <div className="w-full h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : session ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 px-4 py-2">
                    <Image
                      src={session.user?.image || ""}
                      alt={session.user?.name || ""}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm text-gray-700">
                      {session.user?.name}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left text-gray-600 hover:text-gray-900 text-sm px-4 py-2 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth/signin"
                  className="block text-indigo-600 hover:text-indigo-700 text-sm font-medium px-4 py-2 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
