import { BidResult, getJobBids } from '../api/client';

// Module-level cache keyed by jobId
const bidCache = new Map<number, BidResult>();

export async function fetchAndShowBids(jobId: number): Promise<BidResult | null> {
  try {
    const result = await getJobBids(jobId);
    bidCache.set(jobId, result);
    return result;
  } catch (err) {
    // 404 is normal — bids may not exist yet. Swallow silently.
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('404')) {
      return null;
    }
    // For other errors, also return null silently (don't spam notifications for bids)
    return null;
  }
}

export function getBidsForJob(jobId: number): BidResult | undefined {
  return bidCache.get(jobId);
}