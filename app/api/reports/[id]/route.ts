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

    // Check for municipal session in headers
    const municipalSessionHeader = request.headers.get("x-municipal-session");
    let nagarNigam: string | null = null;

    if (municipalSessionHeader) {
      try {
        const municipalSession = JSON.parse(municipalSessionHeader);
        nagarNigam = municipalSession.nagarNigam;
        console.log("Municipal session found:", municipalSession);
      } catch (error) {
        console.error("Error parsing municipal session:", error);
      }
    }

    // If no municipal session, check NextAuth session
    if (!nagarNigam) {
      const session = await getServerSession(authOptions);
      console.log("NextAuth session", session);

      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Check if user is municipal admin
      const { data: adminData, error: adminError } = await supabase
        .from("municipal_admins")
        .select("nagar_nigam")
        .eq("email", session.user.email)
        .single();

      console.log("adminData", adminData);
      console.log("adminError", adminError);

      if (adminError || !adminData) {
        return NextResponse.json(
          { error: "Not authorized to update reports" },
          { status: 403 }
        );
      }

      nagarNigam = adminData.nagar_nigam;
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

    console.log("Authorized for nagar_nigam:", nagarNigam);
    // Update report
    const { data, error } = await supabase
      .from("reports")
      .update({
        status,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("nagar_nigam", nagarNigam) // Ensure admin can only update their jurisdiction
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

    // Check for municipal session in headers
    const municipalSessionHeader = request.headers.get("x-municipal-session");
    let nagarNigam: string | null = null;
    let userEmail: string | null = null;

    if (municipalSessionHeader) {
      try {
        const municipalSession = JSON.parse(municipalSessionHeader);
        nagarNigam = municipalSession.nagarNigam;
        console.log("Municipal session found:", municipalSession);
      } catch (error) {
        console.error("Error parsing municipal session:", error);
      }
    }

    // If no municipal session, check NextAuth session
    if (!nagarNigam) {
      const session = await getServerSession(authOptions);

      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      userEmail = session.user.email;
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
    if (nagarNigam) {
      // Municipal user - check if report belongs to their jurisdiction
      if (data.nagar_nigam !== nagarNigam) {
        return NextResponse.json(
          { error: "Not authorized to view this report" },
          { status: 403 }
        );
      }
    } else if (userEmail && data.user_email !== userEmail) {
      // Regular user - check if they own the report or are municipal admin
      const { data: adminData } = await supabase
        .from("municipal_admins")
        .select("nagar_nigam")
        .eq("email", userEmail)
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
