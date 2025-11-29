/**
 * Miro Upload Types
 */

export interface Product {
  // Base fields
  index: number;
  category: string;
  image_url: string;
  product_url: string;
  title: string;
  writer: string;
  genre: string;
  is_exclusive: boolean;
  discount: string;
  sale_price: string;
  original_price: string;
  copies_sold: string;
  rating: string;
  review_count: string;

  // Detail fields (optional)
  extra_info?: string;
  total_sales?: string;
  review_count_detail?: string;
  favorites?: string;
  release_date?: string;
  contents_meta?: string;
  format?: string;
  pages?: string;
  genres?: string;
  file_size?: string;
  title_detail?: string;
  circle?: string;
  circle_fans?: string;
  campaign_discount?: string;
  campaign_end_date?: string;
  campaign_price?: string;
  original_price_detail?: string;
}

export interface MiroConfig {
  token: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  s3Bucket: string;
  s3Region: string;
}

export interface UploadStats {
  totalProducts: number;
  totalCircles?: number;
  uploadedImages: number;
  failedImages: number;
}
