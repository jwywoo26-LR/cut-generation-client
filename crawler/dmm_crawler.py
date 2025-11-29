"""
DMM Crawler V2 - Base Mode
Extracts product information from DMM list pages
"""

import time
import csv
import re
from pathlib import Path
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

from config import (
    HEADLESS_MODE, PAGE_LOAD_TIMEOUT, WAIT_TIME,
    USER_AGENT, AGE_VERIFY_BUTTON, DEFAULT_OUTPUT_DIR
)


class DMMCrawlerV2:
    """DMM Crawler V2 - Supports base, detail, and extra modes"""

    def __init__(self, base_url, output_dir=DEFAULT_OUTPUT_DIR, category_name=None, mode='base'):
        self.base_url = base_url
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.category_name = category_name
        self.mode = mode  # 'base', 'detail', 'extra'

        self.driver = None
        self.products = []
        self.age_verified = False

    def setup_driver(self):
        """Initialize Chrome WebDriver with anti-detection"""
        options = webdriver.ChromeOptions()

        if HEADLESS_MODE:
            options.add_argument('--headless')

        # Anti-detection
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        options.add_argument(f'--user-agent={USER_AGENT}')

        self.driver = webdriver.Chrome(options=options)
        self.driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)

        # Hide webdriver property
        self.driver.execute_cdp_cmd('Network.setUserAgentOverride', {"userAgent": USER_AGENT})
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        print("✓ WebDriver initialized")

    def click_age_verification(self):
        """Click age verification button if present"""
        if self.age_verified:
            return

        try:
            print("Looking for age verification button...")
            button = WebDriverWait(self.driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, AGE_VERIFY_BUTTON))
            )
            button.click()
            print("✓ Age verification button clicked!")
            time.sleep(3)
            self.age_verified = True
        except TimeoutException:
            print("⚠ No age verification button found (page already accessible)")
            self.age_verified = True
        except Exception as e:
            print(f"⚠ Could not click age verification button: {e}")

    def parse_price(self, price_text):
        """Parse price text to integer (e.g., '792엔' -> 792, '1,320円' -> 1320)"""
        if not price_text:
            return None
        # Remove currency symbols and commas
        cleaned = re.sub(r'[엔円,\s]', '', price_text)
        try:
            return int(cleaned)
        except ValueError:
            return None

    def parse_sales(self, sales_text):
        """Parse sales text to integer (e.g., '판매수: 13,840' -> 13840)"""
        if not sales_text:
            return None
        # Extract number part
        match = re.search(r'[\d,]+', sales_text)
        if match:
            try:
                return int(match.group().replace(',', ''))
            except ValueError:
                return None
        return None

    def parse_review_count(self, review_text):
        """Parse review count (e.g., '(21건)' -> 21)"""
        if not review_text:
            return None
        match = re.search(r'\d+', review_text)
        if match:
            try:
                return int(match.group())
            except ValueError:
                return None
        return None

    def extract_product(self, li_element, index):
        """Extract product information from a single list item"""
        product = {
            'index': index,
            'category': self.category_name or 'default',
            'image_url': None,
            'product_url': None,
            'title': None,
            'writer': None,
            'genre': None,
            'is_exclusive': False,
            'discount': None,
            'sale_price': None,
            'original_price': None,
            'copies_sold': None,
            'rating': None,
            'review_count': None
        }

        try:
            # Image URL and Product URL
            try:
                img_link = li_element.find_element(By.CSS_SELECTOR, 'div.tileListImg a')
                product['product_url'] = img_link.get_attribute('href')
                img = li_element.find_element(By.CSS_SELECTOR, 'div.tileListImg img')
                product['image_url'] = img.get_attribute('src')
            except NoSuchElementException:
                pass

            # Title
            try:
                title_elem = li_element.find_element(By.CSS_SELECTOR, 'div.tileListTtl__txt a')
                product['title'] = title_elem.text.strip()
            except NoSuchElementException:
                pass

            # Writer
            try:
                writer_elem = li_element.find_element(By.CSS_SELECTOR, 'div.tileListTtl__txt--author a')
                product['writer'] = writer_elem.text.strip()
            except NoSuchElementException:
                pass

            # Genre (만화 AI, etc.)
            try:
                genre_elem = li_element.find_element(By.CSS_SELECTOR, 'div.c_icon_genre')
                product['genre'] = genre_elem.text.strip()
            except NoSuchElementException:
                pass

            # Is Exclusive (전매)
            try:
                exclusive_elem = li_element.find_element(By.CSS_SELECTOR, 'span.c_icon_exclusive')
                if exclusive_elem:
                    product['is_exclusive'] = True
            except NoSuchElementException:
                pass

            # Discount (40%OFF, etc.)
            try:
                discount_elem = li_element.find_element(By.CSS_SELECTOR, 'span.c_icon_priceStatus')
                product['discount'] = discount_elem.text.strip()
            except NoSuchElementException:
                pass

            # Sale Price
            try:
                sale_price_elem = li_element.find_element(By.CSS_SELECTOR, 'p.c_txt_price.-em strong')
                product['sale_price'] = self.parse_price(sale_price_elem.text.strip())
            except NoSuchElementException:
                pass

            # Original Price - from data-price attribute in basket button
            try:
                basket_btn = li_element.find_element(By.CSS_SELECTOR, 'a.tileListPurchaseStatus__btn--addToBasket')
                price_attr = basket_btn.get_attribute('data-price')
                if price_attr:
                    product['original_price'] = int(price_attr)
            except NoSuchElementException:
                # Fallback: try from price text
                try:
                    price_elems = li_element.find_elements(By.CSS_SELECTOR, 'p.c_txt_price strong')
                    for elem in price_elems:
                        text = elem.text.strip()
                        if '円' in text:  # Original price in yen
                            product['original_price'] = self.parse_price(text)
                            break
                except:
                    pass

            # Copies Sold
            try:
                sales_elem = li_element.find_element(By.CSS_SELECTOR, 'div.tileListEvaluation__txt')
                product['copies_sold'] = self.parse_sales(sales_elem.text.strip())
            except NoSuchElementException:
                pass

            # Rating - from tileListEvaluation > listRate > listRate__ico > span
            try:
                rating_elem = li_element.find_element(
                    By.CSS_SELECTOR,
                    'div.tileListEvaluation div.listRate span span[class*="listRate__ico--rate"] span'
                )
                rating_text = rating_elem.text.strip()
                if rating_text:
                    product['rating'] = float(rating_text)
            except (NoSuchElementException, ValueError):
                pass

            # Review Count - look for (21건) pattern
            try:
                # Find all listRate__txt and look for one with 건 or 件
                rate_container = li_element.find_element(By.CSS_SELECTOR, 'div.listRate')
                all_texts = rate_container.find_elements(By.CSS_SELECTOR, 'span.listRate__txt')
                for elem in all_texts:
                    text = elem.text.strip()
                    if '건' in text or '件' in text:
                        product['review_count'] = self.parse_review_count(text)
                        break
            except NoSuchElementException:
                pass

            return product

        except Exception as e:
            print(f"  ✗ Error extracting product {index}: {e}")
            return product

    def extract_detail_info(self, product_url):
        """Visit product detail page and extract additional information"""
        import json

        detail = {
            'extra_info': None,
            'total_sales': None,
            'review_count_detail': None,
            'favorites': None,
            'release_date': None,
            'contents_meta': None,
            'format': None,
            'pages': None,
            'genres': None,
            'file_size': None,
            'title_detail': None,
            'circle': None,
            'circle_fans': None,
            'campaign_discount': None,
            'campaign_end_date': None,
            'campaign_price': None,
            'original_price_detail': None
        }

        if not product_url:
            return detail

        try:
            self.driver.get(product_url)
            time.sleep(2)

            # Dismiss any popup by clicking top-right corner (first detail page may have commercial popup)
            try:
                from selenium.webdriver.common.action_chains import ActionChains
                actions = ActionChains(self.driver)
                # Click at top-right corner of the page
                actions.move_by_offset(self.driver.execute_script("return window.innerWidth - 50"), 50).click().perform()
                actions.reset_actions()
                time.sleep(0.5)
            except:
                pass

            # Title from detail page
            try:
                title_elem = self.driver.find_element(By.CSS_SELECTOR, 'h1.productTitle__txt')
                detail['title_detail'] = title_elem.text.strip()
            except NoSuchElementException:
                pass

            # Circle name
            try:
                circle_elem = self.driver.find_element(By.CSS_SELECTOR, 'a.circleName__txt')
                detail['circle'] = circle_elem.text.strip()
            except NoSuchElementException:
                pass

            # Circle fans
            try:
                fans_elem = self.driver.find_element(By.CSS_SELECTOR, 'div.circleFanCount__txt')
                fans_text = fans_elem.text.strip().replace(',', '')
                detail['circle_fans'] = int(fans_text) if fans_text.isdigit() else None
            except (NoSuchElementException, ValueError):
                pass

            # Rankings (extra_info)
            try:
                rankings = {}
                ranking_items = self.driver.find_elements(By.CSS_SELECTOR, 'li.rankingList__item')
                for item in ranking_items:
                    try:
                        label = item.find_element(By.CSS_SELECTOR, 'span.rankingList__txt').text.strip()
                        rank = item.find_element(By.CSS_SELECTOR, 'span.rankingList__txt--number').text.strip()
                        if '24時間' in label:
                            rankings['24h'] = rank
                        elif '週間' in label:
                            rankings['weekly'] = rank
                        elif '月間' in label:
                            rankings['monthly'] = rank
                    except:
                        continue
                if rankings:
                    parts = []
                    if '24h' in rankings:
                        parts.append(f"24h: {rankings['24h']}")
                    if 'weekly' in rankings:
                        parts.append(f"weekly: {rankings['weekly']}")
                    if 'monthly' in rankings:
                        parts.append(f"monthly: {rankings['monthly']}")
                    detail['extra_info'] = ', '.join(parts)
            except:
                pass

            # Total sales
            try:
                sales_elem = self.driver.find_element(By.CSS_SELECTOR, 'span.numberOfSales__txt')
                sales_text = sales_elem.text.strip().replace(',', '')
                detail['total_sales'] = int(sales_text) if sales_text.isdigit() else None
            except (NoSuchElementException, ValueError):
                pass

            # Review count detail
            try:
                review_elem = self.driver.find_element(By.CSS_SELECTOR, 'span.userReview__txt')
                review_text = review_elem.text.strip()
                match = re.search(r'\d+', review_text)
                if match:
                    detail['review_count_detail'] = int(match.group())
            except (NoSuchElementException, ValueError):
                pass

            # Favorites
            try:
                fav_elem = self.driver.find_element(By.CSS_SELECTOR, 'span.favorites__txt')
                fav_text = fav_elem.text.strip()
                match = re.search(r'[\d,]+', fav_text)
                if match:
                    detail['favorites'] = int(match.group().replace(',', ''))
            except (NoSuchElementException, ValueError):
                pass

            # Product information from informationList
            contents_meta = {}
            try:
                info_items = self.driver.find_elements(By.CSS_SELECTOR, 'div.productInformation__item dl.informationList')
                for item in info_items:
                    try:
                        ttl = item.find_element(By.CSS_SELECTOR, 'dt.informationList__ttl').text.strip()
                        txt = item.find_element(By.CSS_SELECTOR, 'dd.informationList__txt').text.strip()

                        if '配信開始日' in ttl:
                            detail['release_date'] = txt
                        elif '作者' in ttl:
                            contents_meta['author'] = txt
                        elif 'シナリオ' in ttl:
                            contents_meta['scenario'] = txt
                        elif '作品形式' in ttl:
                            detail['format'] = txt
                        elif 'ページ数' in ttl:
                            pages_match = re.search(r'\d+', txt)
                            if pages_match:
                                detail['pages'] = int(pages_match.group())
                        elif '題材' in ttl:
                            contents_meta['subject'] = txt
                        elif 'キャンペーン' in ttl:
                            contents_meta['campaign'] = txt
                        elif 'ファイル容量' in ttl:
                            detail['file_size'] = txt
                    except:
                        continue
            except:
                pass

            if contents_meta:
                detail['contents_meta'] = json.dumps(contents_meta, ensure_ascii=False)

            # Genres
            try:
                genre_elems = self.driver.find_elements(By.CSS_SELECTOR, 'ul.genreTagList a.genreTag__txt')
                genres = [elem.text.strip() for elem in genre_elems if elem.text.strip()]
                if genres:
                    detail['genres'] = ', '.join(genres)
            except:
                pass

            # Campaign info from l-areaPurchase
            try:
                campaign_elem = self.driver.find_element(By.CSS_SELECTOR, 'p.campaignBalloon__ttl')
                detail['campaign_discount'] = campaign_elem.text.strip().split('\n')[0].strip()
            except NoSuchElementException:
                pass

            try:
                campaign_date_elem = self.driver.find_element(By.CSS_SELECTOR, 'p.campaignBalloon__txt')
                detail['campaign_end_date'] = campaign_date_elem.text.strip()
            except NoSuchElementException:
                pass

            try:
                price_elem = self.driver.find_element(By.CSS_SELECTOR, 'p.priceList__main--emphasis')
                price_text = price_elem.text.strip().replace(',', '').replace('円', '')
                detail['campaign_price'] = int(price_text) if price_text.isdigit() else None
            except (NoSuchElementException, ValueError):
                pass

            try:
                orig_price_elem = self.driver.find_element(By.CSS_SELECTOR, 'span.priceList__sub--big')
                orig_text = orig_price_elem.text.strip().replace(',', '').replace('円', '')
                detail['original_price_detail'] = int(orig_text) if orig_text.isdigit() else None
            except (NoSuchElementException, ValueError):
                pass

        except Exception as e:
            print(f"    ⚠ Error extracting detail info: {e}")

        return detail

    def extract_extra_info(self, product_url):
        """Extract extra information: commentary and reviews (for extra mode)"""
        import json

        extra = {
            'commentary': None,
            'avg_rating': None,
            'total_reviews': None,
            'reviews_with_comments': None,
            'rating_distribution': None,
            'reviews': None
        }

        if not product_url:
            return extra

        try:
            # Navigate to product page (may already be there from detail extraction)
            current_url = self.driver.current_url
            if product_url not in current_url:
                self.driver.get(product_url)
                time.sleep(2)

            # Extract commentary (작품 코멘트 / 作品コメント)
            try:
                commentary_elem = self.driver.find_element(
                    By.CSS_SELECTOR, 'div.m-productSummary div.summary p.summary__txt'
                )
                extra['commentary'] = commentary_elem.text.strip()
            except NoSuchElementException:
                # Try alternative selector
                try:
                    commentary_elem = self.driver.find_element(
                        By.CSS_SELECTOR, 'div.l-areaProductSummary p.summary__txt'
                    )
                    extra['commentary'] = commentary_elem.text.strip()
                except NoSuchElementException:
                    pass

            # Extract review summary info
            try:
                # Average rating (평균 평가 / 平均評価)
                avg_elem = self.driver.find_element(
                    By.CSS_SELECTOR, 'div.dcd-review__points p.dcd-review__average strong'
                )
                avg_text = avg_elem.text.strip()
                try:
                    extra['avg_rating'] = float(avg_text)
                except ValueError:
                    pass
            except NoSuchElementException:
                pass

            try:
                # Total reviews and comments count (총평가수 / 総評価数)
                eval_elem = self.driver.find_element(
                    By.CSS_SELECTOR, 'div.dcd-review__points p.dcd-review__evaluates'
                )
                eval_text = eval_elem.text.strip()

                # Extract total reviews (e.g., "21" from "총평가수 21 (5개의 코멘트)")
                total_match = re.search(r'(\d+)', eval_text)
                if total_match:
                    extra['total_reviews'] = int(total_match.group(1))

                # Extract comments count (e.g., "5" from "(5개의 코멘트)")
                comments_match = re.search(r'\((\d+)', eval_text)
                if comments_match:
                    extra['reviews_with_comments'] = int(comments_match.group(1))
            except NoSuchElementException:
                pass

            # Extract rating distribution
            try:
                distribution = {}
                rating_rows = self.driver.find_elements(
                    By.CSS_SELECTOR, 'div.dcd-review__rating_map > div'
                )
                for row in rating_rows:
                    try:
                        # Get rating level from class (e.g., dcd-review-rating-50 = 5 stars)
                        rating_span = row.find_element(By.CSS_SELECTOR, 'span[class*="dcd-review-rating-"]')
                        rating_class = rating_span.get_attribute('class')
                        rating_match = re.search(r'dcd-review-rating-(\d+)', rating_class)
                        if rating_match:
                            rating_level = int(rating_match.group(1)) // 10  # 50 -> 5, 40 -> 4, etc.

                            # Get count (e.g., "18건")
                            count_spans = row.find_elements(By.CSS_SELECTOR, 'span')
                            for span in count_spans:
                                text = span.text.strip()
                                if '건' in text or '件' in text:
                                    count_match = re.search(r'(\d+)', text)
                                    if count_match:
                                        distribution[f'{rating_level}_star'] = int(count_match.group(1))
                                        break
                    except:
                        continue

                if distribution:
                    extra['rating_distribution'] = json.dumps(distribution, ensure_ascii=False)
            except:
                pass

            # Extract individual reviews
            try:
                reviews_list = []
                review_items = self.driver.find_elements(
                    By.CSS_SELECTOR, 'div.dcd-review__list ul li.dcd-review__unit'
                )

                for item in review_items:
                    review = {}

                    # Rating
                    try:
                        rating_span = item.find_element(By.CSS_SELECTOR, 'span[class*="dcd-review-rating-"]')
                        rating_class = rating_span.get_attribute('class')
                        rating_match = re.search(r'dcd-review-rating-(\d+)', rating_class)
                        if rating_match:
                            review['rating'] = int(rating_match.group(1)) // 10
                    except:
                        pass

                    # Title
                    try:
                        title_elem = item.find_element(By.CSS_SELECTOR, 'span.dcd-review__unit__title')
                        review['title'] = title_elem.text.strip()
                    except:
                        pass

                    # Comment text
                    try:
                        comment_elem = item.find_element(By.CSS_SELECTOR, 'div.dcd-review__unit__comment')
                        review['comment'] = comment_elem.text.strip()
                    except:
                        pass

                    # Reviewer name
                    try:
                        reviewer_elem = item.find_element(By.CSS_SELECTOR, 'span.dcd-review__unit__reviewer a')
                        review['reviewer'] = reviewer_elem.text.strip()
                    except:
                        pass

                    # Date
                    try:
                        date_elem = item.find_element(By.CSS_SELECTOR, 'span.dcd-review__unit__postdate')
                        date_text = date_elem.text.strip()
                        # Extract date (e.g., "2025-11-25" from "-2025-11-25 -")
                        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', date_text)
                        if date_match:
                            review['date'] = date_match.group(1)
                    except:
                        pass

                    # Helpful votes
                    try:
                        voted_elem = item.find_element(By.CSS_SELECTOR, 'p.dcd-review__unit__voted strong')
                        voted_text = voted_elem.text.strip()
                        voted_match = re.search(r'(\d+)', voted_text)
                        if voted_match:
                            review['helpful_votes'] = int(voted_match.group(1))
                    except:
                        pass

                    if review:
                        reviews_list.append(review)

                if reviews_list:
                    extra['reviews'] = json.dumps(reviews_list, ensure_ascii=False)

            except Exception as e:
                print(f"      ⚠ Error extracting reviews: {e}")

        except Exception as e:
            print(f"    ⚠ Error extracting extra info: {e}")

        return extra

    def crawl_page(self, page_num=1):
        """Crawl a single page of products"""
        try:
            # Construct URL with page number
            if page_num == 1:
                url = self.base_url
            else:
                if '?' in self.base_url:
                    url = f"{self.base_url}&page={page_num}"
                else:
                    url = f"{self.base_url}?page={page_num}"

            print(f"\n📄 Crawling page {page_num}: {url}")
            self.driver.get(url)

            # Click age verification on first page
            if page_num == 1:
                self.click_age_verification()

            # Wait for product list
            wait = WebDriverWait(self.driver, 15)
            try:
                wait.until(EC.presence_of_element_located(
                    (By.CSS_SELECTOR, 'ul.productList, ul.fn-productList')
                ))
            except TimeoutException:
                print("⚠ Product list not found")

            time.sleep(2)

            # Find all products
            product_list = self.driver.find_elements(By.CSS_SELECTOR, 'li.productList__item')

            if not product_list:
                print("✗ No products found on this page")
                return 0

            total_products = len(product_list)
            print(f"Found {total_products} products on page {page_num}")

            # Store current URL for returning after detail extraction
            list_page_url = self.driver.current_url

            # PHASE 1: Extract all base product info first (avoids stale element issues)
            page_products = []
            for idx in range(total_products):
                global_index = len(self.products) + idx + 1
                print(f"  [Base] Processing product {idx + 1}/{total_products} (#{global_index})...")

                try:
                    li_element = product_list[idx]
                    product = self.extract_product(li_element, global_index)
                    page_products.append(product)
                    print(f"    ✓ {product['title'][:30] if product['title'] else 'Unknown'}...")
                except Exception as e:
                    print(f"    ✗ Error extracting product {idx + 1}: {e}")
                    page_products.append({
                        'index': global_index,
                        'category': self.category_name or 'default'
                    })

            # PHASE 2: If detail or extra mode, visit each product URL separately
            if self.mode in ['detail', 'extra']:
                print(f"\n  [Detail] Extracting detail info for {len(page_products)} products...")

                for idx, product in enumerate(page_products, 1):
                    try:
                        if product.get('product_url'):
                            print(f"    [{idx}/{len(page_products)}] Visiting detail page...")
                            detail_info = self.extract_detail_info(product['product_url'])
                            product.update(detail_info)

                            # Extra mode: also extract commentary and reviews
                            if self.mode == 'extra':
                                print(f"      Extracting extra info (commentary, reviews)...")
                                extra_info = self.extract_extra_info(product['product_url'])
                                product.update(extra_info)

                            print(f"      ✓ {product.get('title_detail', product.get('title', 'Unknown'))[:30]}...")
                        else:
                            print(f"    [{idx}/{len(page_products)}] No URL, skipping detail extraction")
                    except KeyboardInterrupt:
                        print(f"\n\n⚠ Interrupted during detail extraction!")
                        # Add products collected so far (including current partial one)
                        self.products.extend(page_products[:idx])
                        raise  # Re-raise to be caught by run()

            # Add all products to main list
            self.products.extend(page_products)

            return total_products

        except TimeoutException:
            print(f"✗ Timeout loading page {page_num}")
            return 0
        except Exception as e:
            print(f"✗ Error crawling page {page_num}: {e}")
            import traceback
            traceback.print_exc()
            return 0

    def save_to_csv(self, filename=None):
        """Save products to CSV"""
        if not self.products:
            print("✗ No products to save")
            return None

        if filename is None:
            timestamp = datetime.now().strftime('%Y-%m-%d')
            category = self.category_name or 'default'
            filename = f"{category}_{timestamp}.csv"

        output_path = self.output_dir / filename

        # Base mode fields
        fieldnames = [
            'index', 'category', 'image_url', 'product_url', 'title', 'writer', 'genre',
            'is_exclusive', 'discount', 'sale_price', 'original_price',
            'copies_sold', 'rating', 'review_count'
        ]

        # Detail mode adds more fields
        if self.mode in ['detail', 'extra']:
            fieldnames.extend([
                'extra_info', 'total_sales', 'review_count_detail', 'favorites',
                'release_date', 'contents_meta', 'format', 'pages', 'genres', 'file_size',
                'title_detail', 'circle', 'circle_fans',
                'campaign_discount', 'campaign_end_date', 'campaign_price', 'original_price_detail'
            ])

        # Extra mode adds commentary and reviews
        if self.mode == 'extra':
            fieldnames.extend([
                'commentary', 'avg_rating', 'total_reviews', 'reviews_with_comments',
                'rating_distribution', 'reviews'
            ])

        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(self.products)

        print(f"\n{'='*60}")
        print(f"✓ Saved {len(self.products)} products to: {output_path}")
        print(f"{'='*60}")

        return output_path

    def run(self, max_pages=1):
        """Run the crawler"""
        try:
            print(f"{'='*60}")
            print(f"DMM Crawler V2 - {self.mode.upper()} Mode")
            print(f"{'='*60}")
            print(f"URL: {self.base_url}")
            print(f"Mode: {self.mode}")
            print(f"Max pages: {max_pages}")
            print(f"Output: {self.output_dir}")
            print(f"{'='*60}\n")

            self.setup_driver()

            for page_num in range(1, max_pages + 1):
                products_found = self.crawl_page(page_num)

                if products_found == 0:
                    print(f"\nNo more products. Stopping at page {page_num}")
                    break

                if page_num < max_pages:
                    print(f"\nWaiting {WAIT_TIME}s before next page...")
                    time.sleep(WAIT_TIME)

            self.save_to_csv()
            print("\n✓ Crawling completed!")

        except KeyboardInterrupt:
            print("\n\n" + "="*60)
            print("⚠ INTERRUPTED BY USER (Ctrl+C)")
            print("="*60)
            if self.products:
                print(f"Saving {len(self.products)} products collected so far...")
                self.save_to_csv()
                print("✓ Partial results saved successfully!")
            else:
                print("No products collected yet.")

        except Exception as e:
            print(f"\n✗ Crawling failed: {e}")
            import traceback
            traceback.print_exc()
            if self.products:
                print("Saving partial results...")
                self.save_to_csv()

        finally:
            if self.driver:
                self.driver.quit()
                print("\n✓ WebDriver closed")


def crawl_multiple_urls(url_dict, max_pages=1, output_dir=DEFAULT_OUTPUT_DIR, mode='base'):
    """Crawl multiple URLs with category names"""
    print(f"{'='*60}")
    print(f"DMM Crawler V2 - Multi-URL Mode")
    print(f"{'='*60}")
    print(f"Mode: {mode}")
    print(f"Categories: {len(url_dict)}")
    print(f"Pages per category: {max_pages}")
    print(f"{'='*60}\n")

    results = {}

    for idx, (category_name, url) in enumerate(url_dict.items(), 1):
        print(f"\n{'#'*60}")
        print(f"Category {idx}/{len(url_dict)}: {category_name}")
        print(f"{'#'*60}\n")

        try:
            crawler = DMMCrawlerV2(
                base_url=url,
                output_dir=output_dir,
                category_name=category_name,
                mode=mode
            )
            crawler.run(max_pages=max_pages)

            results[category_name] = {
                'products': len(crawler.products),
                'status': 'success'
            }

        except Exception as e:
            print(f"\n✗ Failed to crawl {category_name}: {e}")
            results[category_name] = {
                'products': 0,
                'status': 'failed',
                'error': str(e)
            }

        if idx < len(url_dict):
            print(f"\nWaiting {WAIT_TIME}s before next category...")
            time.sleep(WAIT_TIME)

    # Summary
    print(f"\n\n{'='*60}")
    print(f"CRAWLING SUMMARY")
    print(f"{'='*60}")

    total = 0
    for category, result in results.items():
        icon = "✓" if result['status'] == 'success' else "✗"
        print(f"{icon} {category}: {result['products']} products")
        total += result['products']

    print(f"\nTotal: {total} products")
    print(f"{'='*60}\n")

    return results


def main():
    """Main entry point"""
    import argparse
    import json

    parser = argparse.ArgumentParser(description='DMM Crawler V2 - Base Mode')
    parser.add_argument('--pages', type=int, default=1, help='Pages to crawl (default: 1)')
    parser.add_argument('--output', default=DEFAULT_OUTPUT_DIR, help='Output directory')
    parser.add_argument('--url', help='Single URL to crawl')
    parser.add_argument('--urls-file', help='JSON file with {category: url} mapping')
    parser.add_argument('--category', help='Category name for single URL')

    args = parser.parse_args()

    if args.urls_file:
        with open(args.urls_file, 'r', encoding='utf-8') as f:
            url_dict = json.load(f)
        crawl_multiple_urls(url_dict, max_pages=args.pages, output_dir=args.output)

    elif args.url:
        crawler = DMMCrawlerV2(
            base_url=args.url,
            output_dir=args.output,
            category_name=args.category
        )
        crawler.run(max_pages=args.pages)

    else:
        print("Error: Please provide --url or --urls-file")
        parser.print_help()


if __name__ == '__main__':
    main()
