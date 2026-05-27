import { extractPdf } from "./pdf";
import { extractDocx } from "./docx";
import { extractRtf } from "./rtf";
import { extractMarkdown } from "./markdown";
import { extractHtml } from "./html";

export type ExtractedFile = {
  text: string;
  filename: string;
  format: string;
};

export async function extractFile(file: File): Promise<ExtractedFile> {
  const filename = file.name;
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const mime = file.type;

  if (ext === "pdf" || mime === "application/pdf") {
    const buf = await file.arrayBuffer();
    return { text: await extractPdf(buf), filename, format: "pdf" };
  }

  if (
    ext === "docx" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const buf = await file.arrayBuffer();
    return { text: await extractDocx(buf), filename, format: "docx" };
  }

  if (ext === "rtf" || mime === "application/rtf" || mime === "text/rtf") {
    const buf = await file.arrayBuffer();
    return { text: extractRtf(buf), filename, format: "rtf" };
  }

  if (ext === "md" || ext === "markdown" || mime === "text/markdown") {
    const text = await file.text();
    return { text: extractMarkdown(text), filename, format: "markdown" };
  }

  if (ext === "html" || ext === "htm" || mime === "text/html") {
    const text = await file.text();
    return { text: extractHtml(text), filename, format: "html" };
  }

  if (
    ext === "txt" ||
    ext === "vtt" ||
    ext === "srt" ||
    ext === "json" ||
    ext === "csv" ||
    ext === "tsv" ||
    mime.startsWith("text/")
  ) {
    return { text: await file.text(), filename, format: ext };
  }

  throw new Error(
    `Unsupported file type: ${filename}. Supported: PDF, DOCX, RTF, Markdown, HTML, TXT, JSON, VTT, SRT, plus audio (mp3/wav/m4a/mp4) via Whisper.`,
  );
}
