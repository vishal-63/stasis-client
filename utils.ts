type SupportedSource = "instagram" | "youtube" | "unknown";

export const getVideoSource = (url: string): SupportedSource => {
  if (!url) return "unknown";

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Instagram
    if (hostname.includes("instagram.com") || hostname.includes("instagr.am")) {
      return "instagram";
    }

    // YouTube
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return "youtube";
    }

    return "unknown";
  } catch (error) {
    return "unknown";
  }
};

export function cleanMarkdownToPlainText(markdown: string): string {
  if (!markdown) return "";

  return (
    markdown
      // 1. Remove markdown headers (e.g., ### Rankings -> Rankings)
      .replace(/^#{1,6}\s+(.*)$/gim, "$1")

      // 2. Remove bold formatting (e.g., **Ducati** -> Ducati)
      .replace(/\*\*(.*?)\*\*/g, "$1")

      // 3. Remove italic formatting (e.g., *The Beast* -> The Beast)
      .replace(/\*(.*?)\*/g, "$1")

      // 4. Clean up inline code blocks if any (e.g., `code` -> code)
      .replace(/`(.*?)`/g, "$1")

      // 5. Trim extra leading/trailing whitespace per line
      .split("\n")
      .map((line) => line.trim())
      .join("\n")

      // 6. Collapse multiple consecutive empty lines down to a single empty line
      .replace(/\n{3,}/g, "\n\n")
  );
}
