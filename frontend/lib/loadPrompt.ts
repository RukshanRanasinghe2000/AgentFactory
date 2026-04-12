import fs from "fs";
import path from "path";

/**
 * Reads a named prompt from factory_agent/system_agent.md.
 * Extracts the content of the first fenced code block (```) under the given section heading.
 *
 * @param section - The markdown heading to look for, e.g. "Clarify Prompt" or "Refine Prompt"
 */
export function loadPrompt(section: string): string {
  const filePath = path.join(process.cwd(), "..", "factory_agent", "system_agent.md");
  const content = fs.readFileSync(filePath, "utf-8");

  // Find the section heading
  const sectionRegex = new RegExp(`# ${section}`, "m");
  const sectionStart = content.search(sectionRegex);
  if (sectionStart === -1) {
    throw new Error(`Section "# ${section}" not found in system_agent.md`);
  }

  // Find the first ``` block after the section heading
  // Flexible regex to handle different line endings (\n or \r\n) and optional language tags
  const afterSection = content.slice(sectionStart);
  const blockMatch = afterSection.match(/```.*?\r?\n([\s\S]*?)```/);
  if (!blockMatch) {
    throw new Error(`No code block found under "# ${section}" in system_agent.md`);
  }

  return blockMatch[1].trim();
}
