import { NextRequest, NextResponse } from "next/server";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "";

function normalizeUploadPath(rawPath: string, strapiBase: URL): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed) return null;

  // Preferred input: relative media path returned by Strapi (e.g. /uploads/file.pdf)
  if (trimmed.startsWith("/")) return trimmed;

  // Future-proofing: accept absolute URLs only when they point to our Strapi origin.
  try {
    const parsed = new URL(trimmed);
    if (parsed.origin !== strapiBase.origin) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

/**
 * Proxies a file from Strapi and serves it with Content-Disposition: inline
 * so the browser opens it in a new tab (e.g. PDF viewer) instead of downloading.
 * Only allows paths under /uploads/ for security.
 */
export async function GET(request: NextRequest) {
  if (!STRAPI_URL) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  let strapiBase: URL;
  try {
    strapiBase = new URL(STRAPI_URL);
  } catch {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const rawPath = request.nextUrl.searchParams.get("path");
  const normalizedPath = rawPath ? normalizeUploadPath(rawPath, strapiBase) : null;
  const pathname = normalizedPath?.split("?")[0] ?? "";
  if (!normalizedPath || !pathname.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const fileUrl = `${strapiBase.origin}${normalizedPath}`;
  try {
    const res = await fetch(fileUrl, { headers: { Accept: "*/*" } });
    if (!res.ok) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = "inline"; // open in browser instead of download

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (err) {
    console.error("File preview fetch error:", err);
    return NextResponse.json({ error: "Failed to load file" }, { status: 502 });
  }
}
