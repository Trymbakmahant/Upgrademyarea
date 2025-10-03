import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nagarNigam = searchParams.get("nagarNigam");
    console.log("nagarNigam", nagarNigam);
    if (!nagarNigam) {
      return NextResponse.json(
        { error: "Municipal corporation not specified" },
        { status: 400 }
      );
    }

    // Get reports for this municipal corporation
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("nagar_nigam", nagarNigam)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      );
    }

    // Get statistics
    const stats = {
      total: reports.length,
      submitted: reports.filter((r) => r.status === "submitted").length,
      in_progress: reports.filter((r) => r.status === "in_progress").length,
      completed: reports.filter((r) => r.status === "completed").length,
    };

    return NextResponse.json({
      reports,
      stats,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
