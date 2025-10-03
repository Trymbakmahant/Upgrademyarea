import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Rough distance filter using lat/lng bounding box (in meters)
function metersToLatLngDelta(meters: number, latitude: number) {
  const earthRadiusMeters = 6378137;
  const dLat = (meters / earthRadiusMeters) * (180 / Math.PI);
  const dLng =
    (meters / (earthRadiusMeters * Math.cos((Math.PI * latitude) / 180))) *
    (180 / Math.PI);
  return { dLat, dLng };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const radius = parseInt(searchParams.get("radius") || "250", 10); // meters
    const nagarNigam = searchParams.get("nagarNigam");

    if (!category || Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json(
        { error: "Missing category or location" },
        { status: 400 }
      );
    }

    const { dLat, dLng } = metersToLatLngDelta(radius, lat);
    const minLat = (lat - dLat).toString();
    const maxLat = (lat + dLat).toString();
    const minLng = (lng - dLng).toString();
    const maxLng = (lng + dLng).toString();

    let query = supabase
      .from("reports")
      .select(
        "id, images, location, category, description, nagar_nigam, status, created_at"
      )
      .eq("category", category)
      .in("status", ["submitted", "in_progress"]) // only show actionable
      .filter("location->>latitude", "gte", minLat)
      .filter("location->>latitude", "lte", maxLat)
      .filter("location->>longitude", "gte", minLng)
      .filter("location->>longitude", "lte", maxLng)
      .order("created_at", { ascending: false })
      .limit(10);

    if (nagarNigam) {
      query = query.eq("nagar_nigam", nagarNigam);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supabase error (similar):", error);
      return NextResponse.json(
        { error: "Failed to fetch similar reports" },
        { status: 500 }
      );
    }

    // Best-effort vote counts (requires report_votes table: report_id, user_email)
    // If table doesn't exist, ignore counts gracefully
    const reports = Array.isArray(data) ? data : [];
    const ids = reports.map((r) => r.id);
    let counts: Record<string, number> = {};
    let votedSet = new Set<string>();

    if (ids.length > 0) {
      const { data: votesAgg, error: votesError } = await supabase
        .from("report_votes")
        .select("report_id, count:report_id", { count: "exact", head: false })
        .in("report_id", ids);

      if (!votesError && Array.isArray(votesAgg)) {
        // Supabase doesn't support select count alias per row in this way; fallback per-id aggregation:
        counts = Object.fromEntries(ids.map((id) => [id, 0]));
        for (const id of ids) {
          const { count } = await supabase
            .from("report_votes")
            .select("report_id", { count: "exact", head: true })
            .eq("report_id", id);
          counts[id] = count ?? 0;
        }
      }

      const { data: myVotes, error: myVotesErr } = await supabase
        .from("report_votes")
        .select("report_id")
        .eq("user_email", session.user.email)
        .in("report_id", ids);
      if (!myVotesErr && Array.isArray(myVotes)) {
        type VoteRow = { report_id: string };
        votedSet = new Set((myVotes as VoteRow[]).map((v) => v.report_id));
      }
    }

    const enriched = reports.map((r) => ({
      ...r,
      vote_count: counts[r.id] ?? 0,
      has_voted: votedSet.has(r.id),
    }));
    return NextResponse.json({ reports: enriched });
  } catch (error) {
    console.error("API error (similar):", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
