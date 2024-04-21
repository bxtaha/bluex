export interface BreadcrumbItem {
  id: number;
  name: string;
  url: string;
}

export default interface ProductsGridHomeCardProps {
  imgsrc: string;
  alttext: string;
  title: string;
  basePrice: number;
  currentPrice: number;
}

export interface FetchedProducts {
  status: string;
  message: string;
  data: Data;
}

export interface Data {
  totalProducts: number;
  pageCount: any;
  result: Product[];
}

export interface Product {
  skus: Skus;
  _id: string;
  title: string;
  item_imgs: ItemImgs[];
  num_iid: string;
  price: string;
  pic_url: string;
  orginal_price: string;
  description: string;
  brand: string;
  item_size: string;
  item_weight: string;
  props: Prop[];
  total_sold: any;
  video: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  category?: string;
  props_list: [string]
}

export interface Skus {
  sku: Sku[];
}

export interface Sku {
  price: string;
  total_price: number;
  sales: string;
  properties: string;
  properties_name: string;
  quantity: string;
  sku_id: string;
  spec_id: string;
  _id: string;
}

export interface ItemImgs {
  url: string;
  _id: string;
  alt: string
}

export interface Prop {
  name: string;
  value: string;
  _id: string;
}

export interface PropsList {
  '0:0': string;
  '0:1': string;
  '1:0'?: string;
  '1:1'?: string;
  '1:2'?: string;
  '1:3'?: string;
  '1:4'?: string;
  '0:2'?: string;
  '0:3'?: string;
  '0:4'?: string;
  '0:5'?: string;
  '0:6'?: string;
  '0:7'?: string;
  '0:8'?: string;
  '0:9'?: string;
  '0:10'?: string;
  '0:11'?: string;
  '0:12'?: string;
  '0:13'?: string;
  '0:14'?: string;
  '0:15'?: string;
  '0:16'?: string;
}
