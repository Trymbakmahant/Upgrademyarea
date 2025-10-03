import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { images, location, category, description, nagarNigam, voiceNote } =
      body;

    // Validate required fields
    if (
      !images ||
      images.length === 0 ||
      !location ||
      !category ||
      !nagarNigam
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Duplicate guard: prevent creating if similar exists nearby and not completed
    try {
      const { latitude, longitude } = location;
      const metersToLatLngDelta = (meters: number, lat: number) => {
        const earthRadiusMeters = 6378137;
        const dLat = (meters / earthRadiusMeters) * (180 / Math.PI);
        const dLng =
          (meters / (earthRadiusMeters * Math.cos((Math.PI * lat) / 180))) *
          (180 / Math.PI);
        return { dLat, dLng };
      };
      const { dLat, dLng } = metersToLatLngDelta(250, latitude);
      const minLat = String(latitude - dLat);
      const maxLat = String(latitude + dLat);
      const minLng = String(longitude - dLng);
      const maxLng = String(longitude + dLng);

      const { data: dupes, error: dupErr } = await supabase
        .from("reports")
        .select("id, status")
        .eq("category", category)
        .eq("nagar_nigam", nagarNigam)
        .in("status", ["submitted", "in_progress"]) // active issues only
        .filter("location->>latitude", "gte", minLat)
        .filter("location->>latitude", "lte", maxLat)
        .filter("location->>longitude", "gte", minLng)
        .filter("location->>longitude", "lte", maxLng)
        .limit(1);

      if (!dupErr && dupes && dupes.length > 0) {
        return NextResponse.json(
          {
            error:
              "A similar issue already exists nearby. Please vote instead.",
            code: "DUPLICATE_EXISTS",
          },
          { status: 409 }
        );
      }
    } catch (e) {
      // If duplicate check fails, we don't block submission, just log
      console.error("Duplicate check failed:", e);
    }

    // Insert report into database
    const { data, error } = await supabase
      .from("reports")
      .insert({
        user_email: session.user.email,
        user_name: session.user.name || "",
        user_id: session.user.email,
        images,
        location,
        category,
        description: description || null,
        nagar_nigam: nagarNigam,
        voice_note: voiceNote || null,
        status: "submitted",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to submit report" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, report: data });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get("userEmail");

    let query = supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    // If userEmail is provided, filter by user
    if (userEmail && userEmail === session.user.email) {
      query = query.eq("user_email", userEmail);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reports: data });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
