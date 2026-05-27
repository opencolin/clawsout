import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const uint8 = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8);
  const result = await extractText(pdf, { mergePages: true });
  return typeof result.text === "string"
    ? result.text
    : (result.text as string[]).join("\n\n");
}
