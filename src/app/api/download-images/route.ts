import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, zipName } = body;

    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Images array is required' },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    // Download each image and add to zip
    for (const image of images) {
      try {
        const response = await fetch(image.url);
        if (response.ok) {
          const blob = await response.blob();
          const buffer = await blob.arrayBuffer();
          zip.file(image.filename, buffer);
        } else {
          console.warn(`Failed to download ${image.filename}: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Error downloading ${image.filename}:`, error);
      }
    }

    // Generate zip file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Return zip file
    return new NextResponse(zipBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName || 'images.zip'}"`,
      },
    });
  } catch (error) {
    console.error('Error creating zip:', error);
    return NextResponse.json(
      { error: 'Failed to create zip file' },
      { status: 500 }
    );
  }
}