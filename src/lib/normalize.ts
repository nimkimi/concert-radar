const NORDIC: Record<string, string> = { ø: "o", å: "a", æ: "ae" };

export function normalizeArtistName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[øåæ]/g, (c) => NORDIC[c] ?? c)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(the|feat\.?|featuring)(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
