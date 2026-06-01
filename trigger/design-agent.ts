import { task } from "@trigger.dev/sdk/v3";
import { executeDesignAgent } from "@/lib/ai/execute-design-agent";

export const designAgent = task({
  id: "design-agent",
  retry: { maxAttempts: 2 },
  run: async (payload: { prompt: string; roomId: string; userId: string }) => {
    return executeDesignAgent(payload);
  },
});
