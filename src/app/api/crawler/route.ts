import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { url, mode, pages, categoryName, miroUploadCircle, miroUploadRanks } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'Missing required field: url' },
        { status: 400 }
      );
    }

    if (!mode || !['base', 'detail', 'extra'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "base", "detail", or "extra"' },
        { status: 400 }
      );
    }

    const maxPages = pages || 1;
    const category = categoryName || 'default';
    const uploadCircle = miroUploadCircle || false;
    const uploadRanks = miroUploadRanks || false;

    // Create output directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputDir = path.join(process.cwd(), 'data', 'crawler', timestamp);
    await fs.mkdir(outputDir, { recursive: true });

    // Build Python command
    const crawlerPath = path.join(process.cwd(), 'crawler', 'crawler.py');
    let pythonCommand = `python3 "${crawlerPath}" --url "${url}" --pages ${maxPages} --output "${outputDir}" --category "${category}" --mode ${mode}`;

    // Add Miro upload flags if enabled
    if (uploadCircle) {
      pythonCommand += ' --miro-upload-circle';
    }
    if (uploadRanks) {
      pythonCommand += ' --miro-upload-ranks';
    }

    console.log('Running crawler command:', pythonCommand);
    console.log('Miro CIRCLE upload:', uploadCircle);
    console.log('Miro RANKS upload:', uploadRanks);

    // Set environment variables for Python script
    const env = {
      ...process.env,
      MIRO_TOKEN: process.env.MIRO_TOKEN,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
      S3_REGION: process.env.AWS_REGION || 'ap-northeast-2',
    };

    // Execute Python crawler
    const { stdout, stderr } = await execAsync(pythonCommand, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      timeout: 30 * 60 * 1000, // 30 minutes timeout
      env,
    });

    if (stderr) {
      console.error('Crawler stderr:', stderr);
    }

    console.log('Crawler stdout:', stdout);

    // Find the generated CSV file
    const files = await fs.readdir(outputDir);
    const csvFile = files.find(f => f.endsWith('.csv'));

    if (!csvFile) {
      return NextResponse.json(
        { error: 'No CSV file generated', stdout, stderr },
        { status: 500 }
      );
    }

    const csvPath = path.join(outputDir, csvFile);
    const csvContent = await fs.readFile(csvPath, 'utf-8');

    // Parse CSV to get record count
    const lines = csvContent.split('\n').filter(line => line.trim());
    const recordCount = Math.max(0, lines.length - 1); // Subtract header

    const miroMessages = [];
    if (uploadCircle) miroMessages.push('CIRCLE board');
    if (uploadRanks) miroMessages.push('RANKS board');
    const miroSuffix = miroMessages.length > 0 ? ` and uploaded to ${miroMessages.join(' and ')}` : '';

    // Clean up: delete the CSV file and output directory after processing
    try {
      await fs.unlink(csvPath); // Delete CSV file
      await fs.rmdir(outputDir); // Delete empty directory
      console.log('Cleaned up crawler output:', outputDir);
    } catch (cleanupError) {
      console.warn('Failed to clean up crawler output:', cleanupError);
      // Don't fail the request if cleanup fails
    }

    return NextResponse.json({
      success: true,
      message: `Crawled ${recordCount} records in ${mode} mode${miroSuffix}`,
      csvFile: csvFile,
      csvPath: `/data/crawler/${timestamp}/${csvFile}`,
      recordCount: recordCount,
      mode: mode,
      pages: maxPages,
      csvContent: csvContent,
      miroCircleUploaded: uploadCircle,
      miroRanksUploaded: uploadRanks,
    });

  } catch (error) {
    console.error('Crawler error:', error);
    return NextResponse.json(
      {
        error: 'Failed to run crawler',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
