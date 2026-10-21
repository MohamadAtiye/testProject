export function untrustedBlock(source: string, content: string): string {
  const safeSource = source.replace(/[^A-Za-z0-9_.-]/g, "") || "data";
  const safeContent = content.replaceAll("</untrusted_data>", "<\\/untrusted_data>");

  return `<untrusted_data source="${safeSource}">\n${safeContent}\n</untrusted_data>`;
}
