import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    console.log("session", session);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, adminNotes } = body;

    // Validate status
    if (
      !status ||
      !["submitted", "in_progress", "completed"].includes(status)
    ) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const {
      data: data2,
      count,
      error: countError,
    } = await supabase.from("municipal_admins").select("*", { count: "exact" });

    console.log(data2); // should show actual rows
    console.log(count); // should match rows.length
    console.log("countError", countError);
    // Check if user is municipal admin
    const { data: adminData, error: adminError } = await supabase
      .from("municipal_admins")
      .select("nagar_nigam")
      .eq("email", session.user.email)
      .single();
    console.log("adminData", adminData);
    console.log("adminError", adminError);
    console.log("session.user.email", session.user.email);
    if (adminError || !adminData) {
      return NextResponse.json(
        { error: "Not authorized to update reports" },
        { status: 403 }
      );
    }
    console.log("adminData.nagar_nigam", adminData.nagar_nigam);
    // Update report
    const { data, error } = await supabase
      .from("reports")
      .update({
        status,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("nagar_nigam", adminData.nagar_nigam) // Ensure admin can only update their jurisdiction
      .select()
      .single();

    console.log("data", data);
    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to update report" },
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check if user can access this report
    if (data.user_email !== session.user.email) {
      // Check if user is municipal admin for this report's jurisdiction
      const { data: adminData } = await supabase
        .from("municipal_admins")
        .select("nagar_nigam")
        .eq("email", session.user.email)
        .eq("nagar_nigam", data.nagar_nigam)
        .single();

      if (!adminData) {
        return NextResponse.json(
          { error: "Not authorized to view this report" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ report: data });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
