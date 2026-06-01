const CAPACITY_PATTERN = /high demand|429|resource_exhausted|overloaded|quota|capacity/i;

export function isModelCapacityError(error: unknown): boolean {
  if (!error) return false;

  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    const retry = error as Error & { errors?: unknown[]; lastError?: unknown };
    if (retry.lastError instanceof Error) parts.push(retry.lastError.message);
    if (Array.isArray(retry.errors)) {
      for (const nested of retry.errors) {
        if (nested instanceof Error) parts.push(nested.message);
      }
    }
  } else {
    parts.push(String(error));
  }

  return CAPACITY_PATTERN.test(parts.join(" "));
}

/** Whether to try the next Gemini model in the fallback chain. */
export function isRetryableModelError(error: unknown): boolean {
  if (isModelCapacityError(error)) return true;

  const message = error instanceof Error ? error.message : String(error);
  return /not found for api version|not supported for generatecontent|model.*not found/i.test(
    message
  );
}

export function getDesignAgentErrorMessage(error: unknown): string {
  if (isModelCapacityError(error)) {
    return "Ghost AI is temporarily busy (AI capacity limit). Please wait a minute and try again.";
  }

  const message = error instanceof Error ? error.message : String(error);

  if (/GOOGLE_AI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY/i.test(message)) {
    return "Ghost AI is not configured (missing Google AI API key).";
  }

  if (/room not found/i.test(message)) {
    return "Canvas room is not ready yet. Refresh the page and try again.";
  }

  if (/flow object|canvas storage/i.test(message)) {
    return message;
  }

  return "Ghost AI encountered an error. Please try again.";
}

export function getGeminiModelCandidates(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  const defaults = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
  ];
  if (!configured) return defaults;
  return [configured, ...defaults.filter((model) => model !== configured)];
}
