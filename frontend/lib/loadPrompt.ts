import fs from "fs";
import path from "path";

/**
 * Reads a named prompt from public/prompts/system_agent.md.
 *
 * The file lives in frontend/public/prompts/ which is always included
 * in both Docker builds and buildpack deployments.
 *
 * Source of truth: frontend/public/prompts/system_agent.md
 * (mirrored from frontend/factory_agent/system_agent.md)
 */
export function loadPrompt(section: string): string {
  const filePath = path.join(process.cwd(), "public", "factory_agents", "system_agent.md");
  const content = fs.readFileSync(filePath, "utf-8");

  const sectionStart = content.search(new RegExp(`# ${section}`, "m"));
  if (sectionStart === -1) {
    throw new Error(`Section "# ${section}" not found in system_agent.md`);
  }

  const blockMatch = content.slice(sectionStart).match(/```.*?\r?\n([\s\S]*?)```/);
  if (!blockMatch) {
    throw new Error(`No code block found under "# ${section}" in system_agent.md`);
  }

  return blockMatch[1].trim();
}
