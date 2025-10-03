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
