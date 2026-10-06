import { NextRequest } from "next/server";
import { redirectByNumber } from "@/lib/redirect";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return redirectByNumber(req, code, "QR");
}
