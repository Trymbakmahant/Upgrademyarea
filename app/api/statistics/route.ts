import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Get total reports count
    const { count: totalReports, error: totalError } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true });

    if (totalError) {
      console.error("Error fetching total reports:", totalError);
      return NextResponse.json(
        { error: "Failed to fetch total reports" },
        { status: 500 }
      );
    }

    // Get resolved reports count
    const { count: resolvedReports, error: resolvedError } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    if (resolvedError) {
      console.error("Error fetching resolved reports:", resolvedError);
      return NextResponse.json(
        { error: "Failed to fetch resolved reports" },
        { status: 500 }
      );
    }

    // Get in-progress reports count
    const { count: inProgressReports, error: inProgressError } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .in("status", ["submitted", "in_progress", "under_review"]);

    if (inProgressError) {
      console.error("Error fetching in-progress reports:", inProgressError);
      return NextResponse.json(
        { error: "Failed to fetch in-progress reports" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      totalReports: totalReports || 0,
      resolvedReports: resolvedReports || 0,
      inProgressReports: inProgressReports || 0,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
