import { task } from "@trigger.dev/sdk/v3";
import { executeDesignAgent } from "@/lib/ai/execute-design-agent";

export const designAgent = task({
  id: "design-agent",
  retry: { maxAttempts: 2 },
  run: executeDesignAgent,
});
