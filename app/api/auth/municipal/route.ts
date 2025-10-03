import { NextRequest, NextResponse } from "next/server";

// Municipal credentials - in production, store these in environment variables or database
const MUNICIPAL_CREDENTIALS = {
  ranchi2024: {
    password: "ranchi123",
    nagarNigam: "Ranchi Municipal Corporation",
    name: "Ranchi Municipal Admin",
  },
  jamshedpur2024: {
    password: "jamshedpur123",
    nagarNigam: "Jamshedpur Notified Area Committee",
    name: "Jamshedpur Municipal Admin",
  },
  dhanbad2024: {
    password: "dhanbad123",
    nagarNigam: "Dhanbad Municipal Corporation",
    name: "Dhanbad Municipal Admin",
  },
  bokaro2024: {
    password: "bokaro123",
    nagarNigam: "Bokaro Steel City Municipal Corporation",
    name: "Bokaro Municipal Admin",
  },
  deoghar2024: {
    password: "deoghar123",
    nagarNigam: "Deoghar Municipal Corporation",
    name: "Deoghar Municipal Admin",
  },
};

export async function POST(request: NextRequest) {
  try {
    const { municipalId, password } = await request.json();

    if (!municipalId || !password) {
      return NextResponse.json(
        { error: "Municipal ID and password are required" },
        { status: 400 }
      );
    }

    const credentials =
      MUNICIPAL_CREDENTIALS[municipalId as keyof typeof MUNICIPAL_CREDENTIALS];

    if (!credentials) {
      return NextResponse.json(
        { error: "Invalid Municipal ID" },
        { status: 401 }
      );
    }

    const isValidPassword = password === credentials.password;

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      municipalId,
      nagarNigam: credentials.nagarNigam,
      name: credentials.name,
    });
  } catch (error) {
    console.error("Municipal login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
