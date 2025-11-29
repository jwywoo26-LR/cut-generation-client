"""
DMM Circle Board Uploader - Grouped by Circle/Author
Groups products by circle and displays with detail cards
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
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()


class CircleBoardUploader:
    """Upload products to Miro grouped by circle/author"""

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
        self.s3_prefix = 'dmm-circle-images/'
        self.s3 = boto3.client("s3", **aws_config)

        self.board_id = None

        # Layout configuration
        self.card_width = 280
        self.card_height = 520
        self.image_height = 200
        self.gap_horizontal = 30
        self.gap_vertical = 40

        # Circle header
        self.circle_header_height = 80
        self.circle_gap = 60  # Gap between circle groups

        self.start_x = 0
        self.start_y = 0

        self.stats = {
            'total_products': 0,
            'total_circles': 0,
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

    def read_product_csv(self, csv_path: str) -> dict:
        """Read CSV and return products grouped by circle"""
        if not os.path.exists(csv_path):
            raise ValueError(f"CSV not found: {csv_path}")

        circles = defaultdict(list)

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
                    'extra_info': row.get('extra_info', ''),
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

                # Use circle name, fallback to writer
                circle_name = product_data.get('circle') or product_data.get('writer') or 'Unknown'
                circles[circle_name].append(product_data)
                self.stats['total_products'] += 1

        # Sort products within each circle by index
        for circle_name in circles:
            circles[circle_name].sort(key=lambda x: x['index'])

        # Sort circles by total sales (sum of all products)
        def get_circle_total_sales(circle_products):
            total = 0
            for p in circle_products:
                sales = p.get('total_sales') or p.get('copies_sold', '0')
                if sales:
                    try:
                        total += int(str(sales).replace(',', ''))
                    except:
                        pass
            return total

        sorted_circles = dict(sorted(
            circles.items(),
            key=lambda x: get_circle_total_sales(x[1]),
            reverse=True
        ))

        self.stats['total_circles'] = len(sorted_circles)
        return sorted_circles

    async def upload_image_to_s3_async(self, image_url: str, s3_key: str) -> str:
        """Download image from URL and upload to S3, return presigned URL"""
        import aiohttp

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    if response.status != 200:
                        self.stats['failed_images'] += 1
                        return None
                    image_data = await response.read()

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

            presigned_url = self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.s3_bucket, 'Key': s3_key},
                ExpiresIn=604800
            )

            self.stats['uploaded_images'] += 1
            return presigned_url

        except Exception as e:
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

    async def create_circle_header(self, session: aiohttp.ClientSession, circle_name: str,
                                   products: list, x: float, y: float, width: float):
        """Create header for a circle group"""
        tasks = []

        # Calculate circle stats
        total_sales = 0
        avg_rating = 0
        rating_count = 0
        circle_fans = None

        for p in products:
            sales = p.get('total_sales') or p.get('copies_sold', '0')
            if sales:
                try:
                    total_sales += int(str(sales).replace(',', ''))
                except:
                    pass

            rating = p.get('rating', '')
            if rating:
                try:
                    avg_rating += float(rating)
                    rating_count += 1
                except:
                    pass

            if not circle_fans and p.get('circle_fans'):
                circle_fans = p.get('circle_fans')

        if rating_count > 0:
            avg_rating = round(avg_rating / rating_count, 2)

        center_x = x + width / 2

        # Circle name header
        tasks.append(
            self.create_text_box(
                session,
                f"  {circle_name}",
                center_x,
                y + 25,
                width,
                40,
                fill_color="#4A90D9",
                font_size=16,
                bold=True
            )
        )

        # Circle stats
        stats_parts = [f"  {len(products)} products"]
        if total_sales:
            stats_parts.append(f"  {total_sales:,}부 총 판매")
        if avg_rating:
            stats_parts.append(f"  Avg {avg_rating}")
        if circle_fans:
            stats_parts.append(f"  {circle_fans} fans")

        tasks.append(
            self.create_text_box(
                session,
                " | ".join(stats_parts),
                center_x,
                y + 60,
                width,
                30,
                fill_color="#E8F4F8",
                font_size=12
            )
        )

        await asyncio.gather(*tasks, return_exceptions=True)

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

        # 3. Title
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

        # 4. Price info (BASE MODE FIELD)
        current_y += 30
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

        # 5. Sales count (BASE MODE FIELD)
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

        # 6. Rating & Reviews (if available)
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

        # 7. Release date & Pages (detail mode only)
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

        # 8. Rankings (extra_info - detail mode only)
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

        # 9. Exclusive badge
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

    async def upload_products_by_circle(self, circles: dict):
        """Upload products grouped by circle to Miro"""
        print(f"\n  Creating circle-grouped Miro board layout...")
        print(f"   Total circles: {len(circles)}")
        print(f"   Total products: {self.stats['total_products']}\n")

        # Step 1: Upload all images to S3
        print("  Step 1: Uploading images to S3...")

        all_products = []
        for circle_name, products in circles.items():
            for product in products:
                product['_circle_name'] = circle_name
                all_products.append(product)

        image_urls = {}
        semaphore = asyncio.Semaphore(10)

        async def upload_with_semaphore(product):
            async with semaphore:
                image_url = product.get('image_url', '')
                if not image_url:
                    return

                s3_key = f"{self.s3_prefix}{product['category']}/product_{product['index']}.jpg"
                url = await self.upload_image_to_s3_async(image_url, s3_key)
                if url:
                    image_urls[product['index']] = url

        upload_tasks = [upload_with_semaphore(product) for product in all_products]
        await asyncio.gather(*upload_tasks, return_exceptions=True)
        print(f"   Uploaded {len(image_urls)}/{len(all_products)} images to S3\n")

        # Step 2: Create Miro layout
        print("  Step 2: Creating circle groups on Miro...")

        current_y = self.start_y

        async with aiohttp.ClientSession() as session:
            for circle_idx, (circle_name, products) in enumerate(circles.items()):
                # Calculate width needed for this circle's products
                num_products = len(products)
                cards_per_row = min(num_products, 10)  # Max 10 per row
                num_rows = (num_products + cards_per_row - 1) // cards_per_row

                group_width = cards_per_row * (self.card_width + self.gap_horizontal) - self.gap_horizontal

                print(f"  [{circle_idx+1}/{len(circles)}] {circle_name} ({num_products} products)")

                # Create circle header
                await self.create_circle_header(
                    session,
                    circle_name,
                    products,
                    self.start_x,
                    current_y,
                    group_width
                )

                current_y += self.circle_header_height

                # Create product cards
                for idx, product in enumerate(products):
                    row = idx // cards_per_row
                    col = idx % cards_per_row

                    card_x = self.start_x + col * (self.card_width + self.gap_horizontal)
                    card_y = current_y + row * (self.card_height + self.gap_vertical)

                    image_url = image_urls.get(product['index'])

                    await self.create_product_card(session, product, card_x, card_y, image_url)

                # Move to next circle group
                current_y += num_rows * (self.card_height + self.gap_vertical) + self.circle_gap

        print(f"\n   Created {len(circles)} circle groups on Miro!")

    def _display_stats(self):
        """Display upload statistics"""
        print("\n  Upload Statistics:")
        print(f"   Total circles: {self.stats['total_circles']}")
        print(f"   Total products: {self.stats['total_products']}")
        print(f"   Images uploaded: {self.stats['uploaded_images']}")
        print(f"   Images failed: {self.stats['failed_images']}")

    async def upload_to_miro(self, csv_path: str, category_name: str = "") -> str:
        """Main upload function, returns board URL"""
        try:
            print(f"  Reading products from: {csv_path}")
            circles = self.read_product_csv(csv_path)
            print(f"   Found {len(circles)} circles with {self.stats['total_products']} products\n")

            # Board name max 60 chars
            short_cat = category_name[:15] if category_name else "DMM"
            board_name = f"Circle {short_cat} {datetime.now().strftime('%m/%d %H:%M')}"
            print(f"  Creating Miro board: {board_name}")

            if not self.create_miro_board(board_name, f"Circle view for {category_name}"):
                return None

            await self.upload_products_by_circle(circles)

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

    parser = argparse.ArgumentParser(description='Upload products to Miro grouped by circle')
    parser.add_argument('--csv', required=True, help='Path to CSV file')
    parser.add_argument('--category', help='Category name for board title')

    args = parser.parse_args()

    category = args.category
    if not category:
        category = Path(args.csv).stem

    uploader = CircleBoardUploader()
    board_url = await uploader.upload_to_miro(args.csv, category_name=category)

    if board_url:
        print("\n  Successfully uploaded to Miro!")
    else:
        print("\n  Failed to upload to Miro")


if __name__ == "__main__":
    asyncio.run(main())
