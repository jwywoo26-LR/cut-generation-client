class RequestTracker {
  private activeRequests: Map<string, { type: string; startTime: Date; recordId: string }> = new Map();

  startRequest(requestId: string, type: string, recordId: string): void {
    this.activeRequests.set(requestId, {
      type,
      startTime: new Date(),
      recordId
    });
  }

  endRequest(requestId: string): void {
    this.activeRequests.delete(requestId);
  }

  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  getActiveRequests(): Array<{ id: string; type: string; startTime: Date; recordId: string; duration: number }> {
    return Array.from(this.activeRequests.entries()).map(([id, request]) => ({
      id,
      ...request,
      duration: Date.now() - request.startTime.getTime()
    }));
  }

  getRequestsByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const request of this.activeRequests.values()) {
      counts[request.type] = (counts[request.type] || 0) + 1;
    }
    return counts;
  }
}

// Singleton instance
export const requestTracker = new RequestTracker();