import { NextResponse } from 'next/server';
import { requestTracker } from '@/lib/requestTracker';

export async function GET() {
  try {
    const activeCount = requestTracker.getActiveRequestCount();
    const activeRequests = requestTracker.getActiveRequests();
    const requestsByType = requestTracker.getRequestsByType();

    return NextResponse.json({
      activeCount,
      activeRequests,
      requestsByType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting request status:', error);
    return NextResponse.json(
      { error: 'Failed to get request status' },
      { status: 500 }
    );
  }
}