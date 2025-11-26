import { NextResponse } from 'next/server';
import { MiroClient } from '@/lib/miroClient';

interface UploadRequest {
  boardId: string;
  images: Array<{
    imageUrl: string;
    title?: string;
    rowLabel?: string;
    columnIndex?: number;
  }>;
  layout?: 'grid' | 'table';
  options?: {
    startX?: number;
    startY?: number;
    imageWidth?: number;
    imageHeight?: number;
    columns?: number;
    spacing?: number;
    rowSpacing?: number;
    columnSpacing?: number;
  };
}

export async function POST(request: Request) {
  try {
    const body: UploadRequest = await request.json();
    const { boardId, images, layout = 'grid', options = {} } = body;

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      );
    }

    // Initialize Miro client
    const miroClient = new MiroClient();

    // Verify board access
    try {
      await miroClient.getBoardInfo(boardId);
    } catch (error) {
      console.error('Failed to access Miro board:', error);
      return NextResponse.json(
        { error: 'Failed to access Miro board. Please check the board ID and permissions.' },
        { status: 403 }
      );
    }

    let results;

    if (layout === 'table') {
      // Table layout with row labels
      const tableImages = images.map((img, index) => ({
        imageUrl: img.imageUrl,
        rowLabel: img.rowLabel || `Row ${Math.floor(index / 5) + 1}`,
        columnIndex: img.columnIndex ?? (index % 5),
        title: img.title,
      }));

      results = await miroClient.uploadImagesAsTable(boardId, tableImages, {
        startX: options.startX,
        startY: options.startY,
        imageWidth: options.imageWidth,
        imageHeight: options.imageHeight,
        rowSpacing: options.rowSpacing,
        columnSpacing: options.columnSpacing,
      });
    } else {
      // Grid layout
      results = await miroClient.uploadImagesGrid(
        boardId,
        images.map((img) => ({
          imageUrl: img.imageUrl,
          title: img.title,
        })),
        {
          startX: options.startX,
          startY: options.startY,
          imageWidth: options.imageWidth,
          imageHeight: options.imageHeight,
          columns: options.columns,
          spacing: options.spacing,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Uploaded ${images.length} images to Miro board`,
      results,
    });
  } catch (error) {
    console.error('Error uploading to Miro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload to Miro' },
      { status: 500 }
    );
  }
}

// GET endpoint to check Miro configuration
export async function GET() {
  try {
    const hasToken = !!process.env.MIRO_TOKEN;

    return NextResponse.json({
      configured: hasToken,
      message: hasToken
        ? 'Miro integration is configured'
        : 'MIRO_TOKEN is not set in environment variables',
    });
  } catch (error) {
    console.error('Error checking Miro configuration:', error);
    return NextResponse.json(
      { error: 'Failed to check Miro configuration' },
      { status: 500 }
    );
  }
}
