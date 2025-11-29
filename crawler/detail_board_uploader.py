"""
DMM Detail Board Uploader - 20x6 Grid Layout
Displays 120 products with full detail information
Optimized for dmm_crawler_v2 CSV format
"""

import os
import csv
import asyncio
import aiohttp
import boto3
import concurrent.futures
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


class DetailBoardUploader:
    """Upload products to Miro in 20x6 grid with detail info cards"""

    def __init__(self):
        self.miro_token = os.getenv('MIRO_TOKEN')
        if not self.miro_token:
            raise ValueError("MIRO_TOKEN not found in environment variables")

        self.headers = {
            'Authorization': f'Bearer {self.miro_token}',
            'Content-Type': 'application/json'
        }

        # AWS S3 configuration
        aws_config = {
            'aws_access_key_id': os.getenv('AWS_ACCESS_KEY_ID'),
            'aws_secret_access_key': os.getenv('AWS_SECRET_ACCESS_KEY'),
            'region_name': os.getenv('S3_REGION', 'ap-northeast-2')
        }

        self.s3_bucket = os.getenv('S3_BUCKET_NAME')
        self.s3_prefix = 'dmm-detail-images/'
        self.s3 = boto3.client("s3", **aws_config)

        self.board_id = None

        # Layout configuration - 20 columns x 6 rows
        self.card_width = 280
        self.card_height = 520
        self.image_height = 200
        self.gap_horizontal = 30
        self.gap_vertical = 40
        self.cards_per_row = 20  # 20 cards per row

        self.start_x = 0
        self.start_y = 0

        self.stats = {
            'total_products': 0,
            'uploaded_images': 0,
            'failed_images': 0
        }

    def create_miro_board(self, board_name: str, description: str = "") -> bool:
        """Create a new Miro board"""
        import requests

        try:
            board_payload = {
                "name": board_name,
                "description": description
            }

            response = requests.post(
                "https://api.miro.com/v2/boards",
                headers=self.headers,
                json=board_payload
            )

            if response.status_code == 201:
                board_data = response.json()
                self.board_id = board_data["id"]
                board_url = f"https://miro.com/app/board/{self.board_id}/"
                print(f"  Miro board created: {board_name}")
                print(f"  Board URL: {board_url}")
                return True
            else:
                print(f"  Miro board creation failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False

        except Exception as e:
            print(f"  Miro board creation exception: {e}")
            return False

    def read_product_csv(self, csv_path: str) -> list:
        """Read CSV and return products sorted by index"""
        if not os.path.exists(csv_path):
            raise ValueError(f"CSV not found: {csv_path}")

        products = []

        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                product_data = {
                    # Base fields
                    'index': int(row.get('index', 0)) if row.get('index', '').isdigit() else 0,
                    'category': row.get('category', ''),
                    'image_url': row.get('image_url', ''),
                    'product_url': row.get('product_url', ''),
                    'title': row.get('title', ''),
                    'writer': row.get('writer', 'Unknown'),
                    'genre': row.get('genre', ''),
                    'is_exclusive': row.get('is_exclusive', '') == 'True',
                    'discount': row.get('discount', ''),
                    'sale_price': row.get('sale_price', ''),
                    'original_price': row.get('original_price', ''),
                    'copies_sold': row.get('copies_sold', '0'),
                    'rating': row.get('rating', ''),
                    'review_count': row.get('review_count', ''),
                    # Detail fields
                    'extra_info': row.get('extra_info', ''),  # Rankings
                    'total_sales': row.get('total_sales', ''),
                    'review_count_detail': row.get('review_count_detail', ''),
                    'favorites': row.get('favorites', ''),
                    'release_date': row.get('release_date', ''),
                    'contents_meta': row.get('contents_meta', ''),
                    'format': row.get('format', ''),
                    'pages': row.get('pages', ''),
                    'genres': row.get('genres', ''),
                    'file_size': row.get('file_size', ''),
                    'title_detail': row.get('title_detail', ''),
                    'circle': row.get('circle', ''),
                    'circle_fans': row.get('circle_fans', ''),
                    'campaign_discount': row.get('campaign_discount', ''),
                    'campaign_end_date': row.get('campaign_end_date', ''),
                    'campaign_price': row.get('campaign_price', ''),
                    'original_price_detail': row.get('original_price_detail', ''),
                }

                products.append(product_data)
                self.stats['total_products'] += 1

        products.sort(key=lambda x: x['index'])
        return products

    async def upload_image_to_s3_async(self, image_url: str, s3_key: str) -> str:
        """Download image from URL and upload to S3, return presigned URL"""
        import aiohttp

        try:
            # Download image from DMM
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    if response.status != 200:
                        self.stats['failed_images'] += 1
                        return None
                    image_data = await response.read()

            # Upload to S3
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                await loop.run_in_executor(
                    executor,
                    lambda: self.s3.put_object(
                        Bucket=self.s3_bucket,
                        Key=s3_key,
                        Body=image_data,
                        ContentType='image/jpeg'
                    )
                )

            # Generate presigned URL (7 days)
            presigned_url = self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.s3_bucket, 'Key': s3_key},
                ExpiresIn=604800
            )

            self.stats['uploaded_images'] += 1
            return presigned_url

        except Exception as e:
            print(f"    S3 upload failed: {e}")
            self.stats['failed_images'] += 1
            return None

    async def create_text_box(self, session: aiohttp.ClientSession, text: str,
                             x: float, y: float, width: float, height: float,
                             fill_color: str = "#ffffff", font_size: int = 12, bold: bool = False) -> bool:
        """Create a text box on Miro board"""
        url = f"https://api.miro.com/v2/boards/{self.board_id}/shapes"

        content = f"<p><strong>{text}</strong></p>" if bold else f"<p>{text}</p>"

        payload = {
            "data": {
                "content": content,
                "shape": "rectangle"
            },
            "style": {
                "fillColor": fill_color
            },
            "position": {
                "x": x,
                "y": y
            },
            "geometry": {
                "width": width,
                "height": height
            }
        }

        try:
            async with session.post(url, headers=self.headers, json=payload) as response:
                if response.status not in [200, 201]:
                    error_text = await response.text()
                    print(f"    Text box failed ({response.status}): {error_text[:100]}")
                return response.status in [200, 201]
        except Exception as e:
            print(f"    Text box exception: {e}")
            return False

    async def add_image_to_board(self, session: aiohttp.ClientSession, image_url: str,
                                x: float, y: float, width: float, title: str = "") -> bool:
        """Add image to Miro board"""
        url = f"https://api.miro.com/v2/boards/{self.board_id}/images"
        payload = {
            "data": {
                "url": image_url,
                "title": title
            },
            "position": {
                "x": x,
                "y": y
            },
            "geometry": {
                "width": width
            }
        }

        try:
            async with session.post(url, headers=self.headers, json=payload) as response:
                return response.status in [200, 201]
        except Exception as e:
            return False

    async def create_product_card(self, session: aiohttp.ClientSession, product: dict,
                                 card_x: float, card_y: float, image_url: str = None):
        """Create a product card - works with base, detail, or extra mode data"""
        tasks = []

        center_x = card_x + self.card_width / 2
        current_y = card_y

        # 1. Rank badge
        tasks.append(
            self.create_text_box(
                session,
                f"#{product['index']}",
                center_x,
                current_y + 15,
                50,
                30,
                fill_color="#FFD700",
                font_size=14,
                bold=True
            )
        )

        # 2. Product image
        current_y += 35
        if image_url:
            tasks.append(
                self.add_image_to_board(
                    session,
                    image_url,
                    center_x,
                    current_y + self.image_height / 2,
                    self.card_width - 20,
                    product['title']
                )
            )
        current_y += self.image_height + 10

        # 3. Title (use title_detail if available from detail mode, otherwise title from base)
        title_text = product.get('title_detail') or product.get('title', '')
        title_text = title_text[:35] + "..." if len(title_text) > 35 else title_text
        tasks.append(
            self.create_text_box(
                session,
                title_text,
                center_x,
                current_y,
                self.card_width - 10,
                35,
                fill_color="#E8E8E8",
                font_size=10,
                bold=True
            )
        )

        # 4. Writer/Circle (use circle if available from detail mode, otherwise writer from base)
        current_y += 30
        writer = product.get('circle') or product.get('writer', '')
        if writer:
            writer_text = writer[:25] + "..." if len(writer) > 25 else writer
            tasks.append(
                self.create_text_box(
                    session,
                    f"  {writer_text}",
                    center_x,
                    current_y,
                    self.card_width - 10,
                    25,
                    fill_color="#E8F4F8",
                    font_size=10
                )
            )

        # 5. Price info (discount, sale_price, original_price) - BASE MODE FIELDS
        current_y += 22
        sale_price = product.get('campaign_price') or product.get('sale_price', '')
        original_price = product.get('original_price_detail') or product.get('original_price', '')
        discount = product.get('campaign_discount') or product.get('discount', '')

        price_text = ""
        if sale_price:
            price_text = f"  {sale_price}円"
        if discount:
            price_text += f" ({discount})"
        if original_price and str(sale_price) != str(original_price):
            price_text += f" ← {original_price}円"

        if price_text:
            tasks.append(
                self.create_text_box(
                    session,
                    price_text,
                    center_x,
                    current_y,
                    self.card_width - 10,
                    22,
                    fill_color="#FFE4E1",
                    font_size=10
                )
            )

        # 6. Sales count (copies_sold from base, total_sales from detail) - BASE MODE FIELD
        current_y += 20
        sales = product.get('total_sales') or product.get('copies_sold', '')
        if sales:
            tasks.append(
                self.create_text_box(
                    session,
                    f"  {sales}부 판매",
                    center_x,
                    current_y,
                    self.card_width - 10,
                    22,
                    fill_color="#90EE90",
                    font_size=10,
                    bold=True
                )
            )

        # === DETAIL MODE ONLY FIELDS BELOW ===

        # 7. Rating & Reviews (if available)
        current_y += 20
        rating = product.get('rating', '')
        review_count = product.get('review_count_detail') or product.get('review_count', '')
        favorites = product.get('favorites', '')

        rating_text = f"  {rating}" if rating else ""
        if review_count:
            rating_text += f" ({review_count})"
        if favorites:
            rating_text += f" | ❤️ {favorites}"

        if rating_text.strip():
            tasks.append(
                self.create_text_box(
                    session,
                    rating_text,
                    center_x,
                    current_y,
                    self.card_width - 10,
                    22,
                    fill_color="#FFF8DC",
                    font_size=10
                )
            )

        # 8. Release date & Pages (detail mode only)
        release_date = product.get('release_date', '')
        pages = product.get('pages', '')
        if release_date or pages:
            current_y += 20
            info_parts = []
            if release_date:
                info_parts.append(f"  {release_date}")
            if pages:
                info_parts.append(f"  {pages}p")
            tasks.append(
                self.create_text_box(
                    session,
                    " | ".join(info_parts),
                    center_x,
                    current_y,
                    self.card_width - 10,
                    22,
                    fill_color="#F0FFF0",
                    font_size=10
                )
            )

        # 9. Rankings (extra_info - detail mode only)
        extra_info = product.get('extra_info', '')
        if extra_info:
            current_y += 20
            tasks.append(
                self.create_text_box(
                    session,
                    f"  {extra_info[:40]}",
                    center_x,
                    current_y,
                    self.card_width - 10,
                    22,
                    fill_color="#FFF0F5",
                    font_size=10
                )
            )

        # 10. Exclusive badge
        if product.get('is_exclusive'):
            tasks.append(
                self.create_text_box(
                    session,
                    "전매",
                    card_x + self.card_width - 30,
                    card_y + 15,
                    40,
                    20,
                    fill_color="#FF6B6B",
                    font_size=10,
                    bold=True
                )
            )

        await asyncio.gather(*tasks, return_exceptions=True)

    async def upload_products_grid_view(self, products: list):
        """Upload products in 20x6 grid to Miro"""
        print(f"\n  Creating 20x6 grid Miro board layout...")
        print(f"   Total products: {len(products)}")
        print(f"   Layout: {self.cards_per_row} columns x {(len(products) + self.cards_per_row - 1) // self.cards_per_row} rows\n")

        # Step 1: Upload images to S3
        print("  Step 1: Uploading images to S3...")

        image_urls = {}
        semaphore = asyncio.Semaphore(10)

        async def upload_with_semaphore(idx, product):
            async with semaphore:
                image_url = product.get('image_url', '')
                if not image_url:
                    return

                s3_key = f"{self.s3_prefix}{product['category']}/product_{product['index']}.jpg"
                url = await self.upload_image_to_s3_async(image_url, s3_key)
                if url:
                    image_urls[idx] = url

        upload_tasks = [upload_with_semaphore(idx, product) for idx, product in enumerate(products)]
        await asyncio.gather(*upload_tasks, return_exceptions=True)
        print(f"   Uploaded {len(image_urls)}/{len(products)} images to S3\n")

        # Step 2: Create Miro cards
        print("  Step 2: Creating product cards on Miro...")

        async with aiohttp.ClientSession() as session:
            for idx, product in enumerate(products):
                row = idx // self.cards_per_row
                col = idx % self.cards_per_row

                card_x = self.start_x + col * (self.card_width + self.gap_horizontal)
                card_y = self.start_y + row * (self.card_height + self.gap_vertical)

                image_url = image_urls.get(idx)

                if (idx + 1) % 20 == 0 or idx == len(products) - 1:
                    print(f"  [{idx+1}/{len(products)}] Creating cards...")

                await self.create_product_card(session, product, card_x, card_y, image_url)

                # Small delay to avoid rate limiting
                await asyncio.sleep(0.1)

        print(f"\n   Created {len(products)} product cards on Miro!")

    def _display_stats(self):
        """Display upload statistics"""
        print("\n  Upload Statistics:")
        print(f"   Total products: {self.stats['total_products']}")
        print(f"   Images uploaded: {self.stats['uploaded_images']}")
        print(f"   Images failed: {self.stats['failed_images']}")

    async def upload_to_miro(self, csv_path: str, category_name: str = "") -> str:
        """Main upload function, returns board URL"""
        try:
            print(f"  Reading products from: {csv_path}")
            products = self.read_product_csv(csv_path)
            print(f"   Found {len(products)} products\n")

            # Board name max 60 chars
            short_category = category_name[:20] if category_name else "DMM"
            board_name = f"{short_category} - {datetime.now().strftime('%m/%d %H:%M')}"
            print(f"  Creating Miro board: {board_name}")

            if not self.create_miro_board(board_name, f"Detail view for {category_name}"):
                return None

            await self.upload_products_grid_view(products)

            self._display_stats()
            board_url = f"https://miro.com/app/board/{self.board_id}/"
            print(f"\n  Board URL: {board_url}")
            return board_url

        except Exception as e:
            print(f"  Error uploading to Miro: {e}")
            import traceback
            traceback.print_exc()
            return None


async def main():
    """Example usage"""
    import argparse

    parser = argparse.ArgumentParser(description='Upload products to Miro in 20x6 grid')
    parser.add_argument('--csv', required=True, help='Path to CSV file')
    parser.add_argument('--category', help='Category name for board title')

    args = parser.parse_args()

    category = args.category
    if not category:
        category = Path(args.csv).stem

    uploader = DetailBoardUploader()
    board_url = await uploader.upload_to_miro(args.csv, category_name=category)

    if board_url:
        print("\n  Successfully uploaded to Miro!")
    else:
        print("\n  Failed to upload to Miro")


if __name__ == "__main__":
    asyncio.run(main())
