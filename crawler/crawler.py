#!/usr/bin/env python3
"""
DMM Crawler - Command Line Interface
Integrates with Next.js API for web crawler functionality
"""

import sys
import argparse
import asyncio
from pathlib import Path
from datetime import datetime

# Import the actual crawler
from dmm_crawler import DMMCrawlerV2, crawl_multiple_urls


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='DMM Product Crawler')
    parser.add_argument('--url', required=True, help='URL to crawl')
    parser.add_argument('--pages', type=int, default=1, help='Number of pages to crawl')
    parser.add_argument('--output', required=True, help='Output directory for CSV file')
    parser.add_argument('--category', default='default', help='Category name')
    parser.add_argument('--mode', choices=['base', 'detail', 'extra'], required=True,
                       help='Crawl mode: base, detail, or extra')
    parser.add_argument('--miro-upload-circle', action='store_true',
                       help='Upload to Miro CIRCLE board')
    parser.add_argument('--miro-upload-ranks', action='store_true',
                       help='Upload to Miro RANKS board')

    return parser.parse_args()


def main():
    """Main execution function"""
    args = parse_arguments()

    print("=" * 60)
    print("DMM Product Crawler")
    print("=" * 60)
    print(f"URL: {args.url}")
    print(f"Mode: {args.mode}")
    print(f"Pages: {args.pages}")
    print(f"Category: {args.category}")
    print(f"Output: {args.output}")
    print(f"Miro CIRCLE upload: {args.miro_upload_circle}")
    print(f"Miro RANKS upload: {args.miro_upload_ranks}")
    print("=" * 60)
    print()

    try:
        # Step 1: Crawl products
        print(f"Crawling {args.url} in {args.mode} mode for {args.pages} page(s)...")

        url_dict = {args.category: args.url}
        results = crawl_multiple_urls(
            url_dict=url_dict,
            max_pages=args.pages,
            output_dir=args.output,
            mode=args.mode
        )

        if not results or args.category not in results:
            print("✗ No products found")
            sys.exit(1)

        # Construct CSV path based on crawler naming convention: {category}_{date}.csv
        timestamp = datetime.now().strftime('%Y-%m-%d')
        csv_filename = f"{args.category}_{timestamp}.csv"
        csv_path = Path(args.output) / csv_filename

        if not csv_path.exists():
            print(f"✗ CSV file not found at {csv_path}")
            sys.exit(1)

        print(f"✓ Saved data to {csv_path}")

        # Step 2: Upload to Miro if requested
        if args.miro_upload_circle or args.miro_upload_ranks:
            print("\n" + "=" * 60)
            print("MIRO UPLOAD")
            print("=" * 60)
            print()

            upload_to_miro(str(csv_path), args.category, args.miro_upload_circle, args.miro_upload_ranks)

        print("\n" + "=" * 60)
        print("✓ Crawling completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def upload_to_miro(csv_path: str, category_name: str, upload_circle: bool, upload_ranks: bool):
    """Upload CSV data to Miro boards"""

    try:
        if upload_circle:
            print(f"\n📤 Uploading to CIRCLE board...")
            asyncio.run(upload_circle_board(csv_path, category_name))

        if upload_ranks:
            print(f"\n📤 Uploading to RANKS board...")
            asyncio.run(upload_ranks_board(csv_path, category_name))

    except ImportError as e:
        print(f"  Error importing Miro uploaders: {e}")
        print("  Make sure boto3, aiohttp, and python-dotenv are installed")
    except Exception as e:
        print(f"  Error uploading to Miro: {e}")
        import traceback
        traceback.print_exc()


async def upload_ranks_board(csv_path: str, category_name: str):
    """Upload to Miro with 20x6 grid layout"""
    try:
        from detail_board_uploader import DetailBoardUploader
        uploader = DetailBoardUploader()
        board_url = await uploader.upload_to_miro(csv_path, category_name=category_name)
        if board_url:
            print(f"  ✓ RANKS board created: {board_url}")
        else:
            print(f"  ✗ Failed to create RANKS board")
    except Exception as e:
        print(f"  ✗ RANKS board upload failed: {e}")
        import traceback
        traceback.print_exc()


async def upload_circle_board(csv_path: str, category_name: str):
    """Upload to Miro grouped by circle"""
    try:
        from circle_board_uploader import CircleBoardUploader
        uploader = CircleBoardUploader()
        board_url = await uploader.upload_to_miro(csv_path, category_name=category_name)
        if board_url:
            print(f"  ✓ CIRCLE board created: {board_url}")
        else:
            print(f"  ✗ Failed to create CIRCLE board")
    except Exception as e:
        print(f"  ✗ CIRCLE board upload failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
