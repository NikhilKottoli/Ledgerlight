import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "data", "registry.json");

  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Registry not found" }, { status: 404 });
    }

    const data = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(data);

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error reading registry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}