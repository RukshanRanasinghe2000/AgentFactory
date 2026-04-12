import { loadPrompt } from "./lib/loadPrompt";

try {
  console.log("Testing loadPrompt('Clarify Prompt')...");
  const clarifyPrompt = loadPrompt("Clarify Prompt");
  console.log("Clarify Prompt loaded successfully!");
  console.log("Length:", clarifyPrompt.length);
  console.log("First 50 chars:", clarifyPrompt.substring(0, 50));

  console.log("\nTesting loadPrompt('Refine Prompt')...");
  const refinePrompt = loadPrompt("Refine Prompt");
  console.log("Refine Prompt loaded successfully!");
  console.log("Length:", refinePrompt.length);
  console.log("First 50 chars:", refinePrompt.substring(0, 50));
} catch (error) {
  console.error("Test failed:", error);
  process.exit(1);
}
