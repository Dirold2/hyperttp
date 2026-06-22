import type { RequestQuery } from "@hyperttp/types";

export function appendQueryToUrl(url: string, query: RequestQuery): string {
  try {
    const urlObj = new URL(url);
    for (const k in query) {
      if (Object.prototype.hasOwnProperty.call(query, k)) {
        const v = query[k];
        if (v == null) continue;
        if (Array.isArray(v)) {
          for (const item of v) {
            if (item != null) urlObj.searchParams.append(k, String(item));
          }
        } else {
          urlObj.searchParams.set(k, String(v));
        }
      }
    }
    return urlObj.toString();
  } catch {
    return url;
  }
}
