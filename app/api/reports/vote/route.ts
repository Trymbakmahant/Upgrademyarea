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
    const { reportId } = body as { reportId?: string };
    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
    }

    // Prevent voting on completed issues
    const { data: report, error: reportErr } = await supabase
      .from("reports")
      .select("id, status")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.status === "completed") {
      return NextResponse.json({ error: "Voting closed" }, { status: 400 });
    }

    // One vote per user per report
    const { data: existing, error: existsErr } = await supabase
      .from("report_votes")
      .select("id")
      .eq("report_id", reportId)
      .eq("user_email", session.user.email)
      .maybeSingle();

    if (existsErr) {
      console.error("Supabase error (vote exists):", existsErr);
    }

    if (!existing) {
      const { error: insertErr } = await supabase.from("report_votes").insert({
        report_id: reportId,
        user_email: session.user.email,
      });
      if (insertErr) {
        console.error("Supabase error (vote insert):", insertErr);
        return NextResponse.json(
          { error: "Failed to record vote" },
          { status: 500 }
        );
      }
    }

    // Return new count
    const { count } = await supabase
      .from("report_votes")
      .select("report_id", { count: "exact", head: true })
      .eq("report_id", reportId);

    return NextResponse.json({ success: true, votes: count ?? 0 });
  } catch (error) {
    console.error("API error (vote):", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
