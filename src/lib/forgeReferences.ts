import { forgeListPackageFiles, forgeReadPackageFile, type ForgePackageSummary } from "@/api/pantry";

/** A Pantry package the user @-mentioned in a Forge message. */
export type PackageReference = Pick<ForgePackageSummary, "name" | "display_name">;

/** The @word being typed at the end of `before` (the text left of the caret), or null. */
export function mentionQuery(before: string): string | null {
  const m = /(?:^|\s)@([\w-]*)$/.exec(before);
  return m ? m[1] : null;
}

/** The references whose @Display Name is still in the message (one deleted from the text is dropped). */
export function referencesIn(text: string, refs: PackageReference[]): PackageReference[] {
  return refs.filter((r, i) => text.includes(`@${r.display_name || r.name}`) && refs.findIndex((o) => o.name === r.name) === i);
}

/**
 * The message with its references named exactly, so the model reads those packages with its package
 * tools instead of searching by guesswork.
 */
export function withReferences(text: string, refs: PackageReference[]): string {
  if (refs.length === 0) return text;
  const list = refs.map((r) => `- \`${r.name}\` (${r.display_name || r.name})`).join("\n");
  return `${text}\n\nReference packages from the Pantry (the @ mentions above). Read their files with list_package_files and read_package_file and follow how they are built:\n${list}`;
}

// A local model has no tools (Pantry calls it), so the browser puts the files in the message.
const MAX_FILE_CHARS = 30_000;
const MAX_TOTAL_CHARS = 80_000;
const SKIP = /(^|\/)(LICENSE|\.gitignore)$|\.(png|jpe?g|gif|ico|svg|lock)$/i;

/** The request with each reference's files appended, within a size budget (shortcut: files past it are listed, not sent). */
export async function withReferenceFiles(request: string, refs: PackageReference[]): Promise<string> {
  let budget = MAX_TOTAL_CHARS;
  const parts: string[] = [];
  for (const ref of refs) {
    const { files } = await forgeListPackageFiles(ref.name);
    const left: string[] = [];
    for (const f of files) {
      if (SKIP.test(f.path)) continue;
      if (f.size > MAX_FILE_CHARS || f.size > budget) {
        left.push(f.path);
        continue;
      }
      const { content } = await forgeReadPackageFile(ref.name, f.path);
      budget -= content.length;
      parts.push(`--- ${ref.name}/${f.path} ---\n${content}`);
    }
    if (left.length) parts.push(`(${ref.name}: not included, too large: ${left.join(", ")})`);
  }
  return `${request}\n\nThe reference packages' files (for reference only: they are not part of this package):\n\n${parts.join("\n\n")}`;
}
