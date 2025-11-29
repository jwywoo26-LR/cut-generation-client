"""
DMM Crawler V2 Configuration
"""

# Browser settings
HEADLESS_MODE = False  # Set True for headless browsing
PAGE_LOAD_TIMEOUT = 30
WAIT_TIME = 3

# User agent
USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

# Age verification button selector
AGE_VERIFY_BUTTON = "#\\:R6\\: > div.css-16bznt1 > div.css-1w77gwi > div.css-1971p6n > div.turtle-component.turtle-Button.large.fill.css-w5doa7"

# Default output directory
DEFAULT_OUTPUT_DIR = 'data'
