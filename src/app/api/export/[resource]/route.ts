import { today } from "@/lib/format";
import { auth } from "@/server/auth";
import { buildExportTable, isResourceKey } from "@/server/export/datasets";
import { formatters } from "@/server/export/formatters";
import { EXPORT_FORMATS, type ExportFormat } from "@/server/export/types";

// exceljs and @react-pdf/renderer require the Node.js runtime (not Edge).
export const runtime = "nodejs";

function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.user.role !== "admin") {
    return new Response("Forbidden — exports are restricted to admin users", {
      status: 403,
    });
  }

  const { resource } = await params;
  if (!isResourceKey(resource)) {
    return new Response("Unknown export resource", { status: 404 });
  }

  const url = new URL(req.url);
  const formatParam = url.searchParams.get("format") ?? "csv";
  if (!isExportFormat(formatParam)) {
    return new Response("Unsupported export format", { status: 400 });
  }

  // Every other resource's filter schema is all-optional, so parsing never
  // throws; ledger's required customerId is the first case that can, for a
  // malformed/hand-crafted request (the UI always supplies a valid one).
  let built;
  try {
    built = await buildExportTable(resource, url.searchParams);
  } catch {
    return new Response("Invalid export filters", { status: 400 });
  }
  const { table, title, filterSummary } = built;
  const result = await formatters[formatParam](table, {
    title,
    generatedAt: new Date(),
    filterSummary,
  });

  const filename = `${resource}-${today()}.${result.ext}`;
  // Node Buffer is a valid runtime body (undici) but isn't in the DOM BodyInit type.
  return new Response(result.body as BodyInit, {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
