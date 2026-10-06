import { NextRequest } from "next/server";
import { redirectBySlug } from "@/lib/redirect";

// Rota legada: QRs impressos com /r/[slug] continuam funcionando.
// Conta como acesso do canal QR.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return redirectBySlug(req, slug);
}
