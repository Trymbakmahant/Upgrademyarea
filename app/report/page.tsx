"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Navigation from "@/components/Navigation";
import { toast } from "react-toastify";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export default function ReportPage() {
  const { data: session, status } = useSession();
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [nagarNigam, setNagarNigam] = useState("");
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similar, setSimilar] = useState<
    Array<{
      id: string;
      images: string[];
      location: { latitude: number; longitude: number; accuracy?: number };
      category: string;
      description: string | null;
      nagar_nigam: string;
      status: "submitted" | "in_progress" | "completed";
      created_at: string;
      vote_count?: number;
      has_voted?: boolean;
    }>
  >([]);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{
    [imageIndex: number]: {
      category: string;
      confidence: number | null;
      reason: string;
    };
  }>({});
  const [classifyingImages, setClassifyingImages] = useState<Set<number>>(
    new Set()
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const categories = useMemo(
    () => ["Potholes", "Drainage", "Street light", "Garbage"],
    []
  );

  const nagarNigamOptions = [
    "Ranchi Municipal Corporation",
    "Jamshedpur Notified Area Committee",
    "Dhanbad Municipal Corporation",
    "Bokaro Steel City Municipal Corporation",
    "Deoghar Municipal Corporation",
    "Phusro Municipal Corporation",
    "Hazaribagh Municipal Corporation",
    "Giridih Municipal Corporation",
    "Ramgarh Municipal Corporation",
    "Medininagar Municipal Corporation",
    "Chatra Municipal Corporation",
    "Koderma Municipal Corporation",
    "Jhumri Telaiya Municipal Corporation",
    "Mango Municipal Corporation",
    "Adityapur Municipal Corporation",
  ];

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          setLocationError(
            "Unable to get your location. Please enable location services."
          );
          console.error("Location error:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
    }
  }, []);

  const canSearchSimilar = useMemo(() => {
    return Boolean(category && location);
  }, [category, location]);

  const requireDetailsStep = useMemo(() => {
    return Boolean(category && nagarNigam && location);
  }, [category, nagarNigam, location]);

  const hasActiveDuplicates = useMemo(() => {
    return similar.length > 0 && similar.some((r) => r.status !== "completed");
  }, [similar]);

  useEffect(() => {
    const fetchSimilar = async () => {
      if (!canSearchSimilar) return;
      try {
        setSimilarLoading(true);
        const params = new URLSearchParams({
          category,
          lat: String(location!.latitude),
          lng: String(location!.longitude),
          nagarNigam: nagarNigam || "",
        });
        const res = await fetch(`/api/reports/similar?${params.toString()}`, {
          method: "GET",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch similar reports");
        }
        const data = await res.json();
        setSimilar(Array.isArray(data.reports) ? data.reports : []);
      } catch (e) {
        console.error(e);
        setSimilar([]);
      } finally {
        setSimilarLoading(false);
      }
    };
    fetchSimilar();
    // re-check when category/location/nagarNigam changes
  }, [canSearchSimilar, category, location, nagarNigam]);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Unable to access camera. Please check permissions.");
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && images.length < 5) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setImages([...images, imageData]);
        stopCamera();
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Classify all uploaded images
  useEffect(() => {
    const classifyAllImages = async () => {
      for (let i = 0; i < images.length; i++) {
        // Skip if already classified or currently classifying
        if (aiSuggestions[i] || classifyingImages.has(i)) continue;

        setClassifyingImages((prev) => new Set(prev).add(i));

        try {
          const res = await fetch("/api/ai/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: images[i], categories }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.category) {
              setAiSuggestions((prev) => ({
                ...prev,
                [i]: {
                  category: data.category,
                  confidence: data.confidence ?? null,
                  reason: data.reason ?? "",
                },
              }));
            }
          }
        } catch (e) {
          console.error(`Failed to classify image ${i}:`, e);
        } finally {
          setClassifyingImages((prev) => {
            const newSet = new Set(prev);
            newSet.delete(i);
            return newSet;
          });
        }
      }
    };

    if (images.length > 0) {
      classifyAllImages();
    } else {
      setAiSuggestions({});
    }
  }, [images, categories, aiSuggestions, classifyingImages]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setVoiceNote(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Unable to access microphone. Please check permissions.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const removeVoiceNote = () => {
    if (voiceNote) {
      URL.revokeObjectURL(voiceNote);
      setVoiceNote(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toast.error("Please sign in to submit a report.");
      return;
    }

    if (images.length === 0 || !location || !category || !nagarNigam) {
      toast.error(
        "Please capture at least one photo, select a category, choose Nagar Nigam, and ensure location is available."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images,
          location,
          category,
          description,
          nagarNigam,
          voiceNote,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit report");
      }

      const result = await response.json();
      console.log("Report submitted successfully:", result);
      toast.success("Report submitted successfully!");
      setSubmitSuccess(true);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error(
        `Failed to submit report: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (reportId: string) => {
    try {
      setVotingId(reportId);
      const res = await fetch("/api/reports/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to vote");
      }
      setSimilar((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                vote_count: data.votes ?? (r.vote_count || 0),
                has_voted: true,
              }
            : r
        )
      );
      toast.success("Voted successfully");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to vote");
    } finally {
      setVotingId(null);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br text-black from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Report Submitted!
          </h2>
          <p className="text-gray-600 mb-6">
            Thank you for helping improve your community. Your report has been
            received and will be reviewed by the appropriate department.
            You&apos;ll receive email updates at{" "}
            <strong>{session?.user?.email}</strong> when the status changes.
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to Home
            </Link>
            <button
              onClick={() => {
                setSubmitSuccess(false);
                setImages([]);
                setDescription("");
                setCategory("");
                setNagarNigam("");
                if (voiceNote) {
                  URL.revokeObjectURL(voiceNote);
                  setVoiceNote(null);
                }
              }}
              className="block w-full border-2 border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Sign In Required
            </h2>
            <p className="text-gray-600 mb-6">
              Please sign in with your Google account to submit reports and
              receive email notifications about their status.
            </p>
            <Link
              href="/auth/signin"
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors inline-block"
            >
              Sign In with Google
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Report an Issue
          </h1>
          <p className="text-gray-600 mb-8">
            Help improve your community by reporting civic issues. Take a photo
            and provide details.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stepper header */}
            <ol className="flex items-center w-full">
              <li className="flex-1 flex items-center">
                <div className="flex items-center">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                    1
                  </span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    Basics
                  </span>
                </div>
                <div className="flex-1 h-0.5 bg-indigo-200 ml-3" />
              </li>
              <li className="flex items-center">
                <div
                  className={`flex items-center ${
                    requireDetailsStep ? "" : "opacity-40"
                  }`}
                >
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full ${
                      hasActiveDuplicates ? "bg-yellow-500" : "bg-indigo-600"
                    } text-white text-xs font-bold`}
                  >
                    2
                  </span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {hasActiveDuplicates ? "Vote" : "Details"}
                  </span>
                </div>
              </li>
            </ol>

            {/* Step 2 (vote) when duplicates exist */}
            {requireDetailsStep && hasActiveDuplicates && (
              <div className="p-4 rounded-lg border bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    Step 2: Vote on existing issue
                  </h3>
                  {similarLoading && (
                    <span className="text-xs text-gray-500">Checking…</span>
                  )}
                </div>
                {similar.length > 0 && (
                  <div className="space-y-3">
                    {similar.map((r) => (
                      <div
                        key={r.id}
                        className="border rounded-lg p-3 bg-white"
                      >
                        <div className="flex items-start gap-3">
                          {r.images?.[0] && (
                            <Image
                              src={r.images[0]}
                              alt="Existing report"
                              width={96}
                              height={72}
                              className="w-24 h-18 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {r.category}
                              </span>
                              <span
                                className={
                                  "text-xs px-2 py-0.5 rounded " +
                                  (r.status === "submitted"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : r.status === "in_progress"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800")
                                }
                              >
                                {r.status === "submitted"
                                  ? "Submitted"
                                  : r.status === "in_progress"
                                  ? "In Progress"
                                  : "Completed"}
                              </span>
                            </div>
                            {r.description && (
                              <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                                {r.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-3">
                              {r.status === "submitted" ||
                              r.status === "in_progress" ? (
                                <button
                                  type="button"
                                  disabled={votingId === r.id || r.has_voted}
                                  onClick={() => handleVote(r.id)}
                                  className="inline-flex items-center gap-1 text-sm text-indigo-700 hover:text-indigo-900"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path d="M3 12l7-8 7 8h-4v6H7v-6H3z" />
                                  </svg>
                                  {votingId === r.id
                                    ? "Voting…"
                                    : r.has_voted
                                    ? "Voted"
                                    : "Vote"}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-500">
                                  Completed; you can still submit if it
                                  restarted
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {r.vote_count ?? 0} votes
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Location Status */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    location ? "bg-green-500" : "bg-red-500"
                  }`}
                ></div>
                <div>
                  <h3 className="font-semibold text-gray-900">Location</h3>
                  {location ? (
                    <p className="text-sm text-gray-600">
                      Located at {location.latitude.toFixed(6)},{" "}
                      {location.longitude.toFixed(6)}
                      <br />
                      <span className="text-xs text-gray-500">
                        Accuracy: ±{Math.round(location.accuracy)}m
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-red-600">
                      {locationError || "Getting location..."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Gate details until basic fields chosen */}
            {!requireDetailsStep && (
              <div className="p-4 rounded-lg border bg-yellow-50 text-yellow-900">
                <p className="text-sm">
                  Select category, Nagar Nigam and allow location to continue.
                </p>
              </div>
            )}

            {/* Step 2 (details) only when no active duplicates */}
            {requireDetailsStep && !hasActiveDuplicates && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos of the Issue * (Up to 5 photos)
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  {images.length}/5 photos captured
                </p>

                {/* Display captured images */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <Image
                          src={image}
                          alt={`Captured issue ${index + 1}`}
                          width={200}
                          height={150}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>

                        {/* AI Classification Result */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 rounded-b-lg">
                          {classifyingImages.has(index) ? (
                            <div className="text-xs flex items-center gap-1">
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                              Analyzing...
                            </div>
                          ) : aiSuggestions[index] ? (
                            <div className="text-xs">
                              <div className="font-medium">
                                {aiSuggestions[index].category === "none"
                                  ? "No civic issue detected"
                                  : aiSuggestions[index].category}
                              </div>
                              {aiSuggestions[index].confidence && (
                                <div className="opacity-75">
                                  {(
                                    aiSuggestions[index].confidence! * 100
                                  ).toFixed(0)}
                                  % confidence
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs opacity-75">
                              Processing...
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Camera capture */}
                {images.length < 5 && (
                  <div className="space-y-4">
                    {!isCapturing ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-indigo-500 transition-colors"
                      >
                        <svg
                          className="w-12 h-12 text-gray-400 mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="text-gray-600">
                          Tap to take photo {images.length + 1}
                        </span>
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black bg-opacity-50 rounded-full p-4">
                              <button
                                type="button"
                                onClick={capturePhoto}
                                className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                              >
                                <div className="w-12 h-12 bg-red-500 rounded-full"></div>
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border text-black border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Nagar Nigam Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nagar Nigam (Municipal Corporation) *
              </label>
              <select
                value={nagarNigam}
                onChange={(e) => setNagarNigam(e.target.value)}
                className="w-full border text-black border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="">Select your Nagar Nigam</option>
                {nagarNigamOptions.map((nagar) => (
                  <option key={nagar} value={nagar}>
                    {nagar}
                  </option>
                ))}
              </select>
            </div>

            {/* Description (only when no active duplicates) */}
            {requireDetailsStep && !hasActiveDuplicates && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full border text-black border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Provide additional details about the issue..."
                />
              </div>
            )}

            {/* Voice Note (only when no active duplicates) */}
            {requireDetailsStep && !hasActiveDuplicates && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice Note (Optional)
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  Record a voice note to provide additional context about the
                  issue
                </p>

                {!voiceNote ? (
                  <div className="space-y-4">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <svg
                          className="w-5 h-5 mr-2 text-red-500"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                        </svg>
                        Start Recording
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-red-700 font-medium">
                              Recording...
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={stopVoiceRecording}
                          className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Stop Recording
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                      <span className="text-green-700 font-medium">
                        Voice note recorded
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <audio controls className="flex-1">
                        <source src={voiceNote} type="audio/wav" />
                        Your browser does not support the audio element.
                      </audio>
                      <button
                        type="button"
                        onClick={removeVoiceNote}
                        className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            {requireDetailsStep && !hasActiveDuplicates && (
              <button
                type="submit"
                disabled={images.length === 0 || isSubmitting}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
