export interface Single1688Product {
  status: string | number;
  apicount: number;
  productinfo: Productinfo;
}

export interface Productinfo {
  num_iid: string;
  title: string;
  desc_short: string;
  price: string;
  total_price: number;
  suggestive_price: number;
  orginal_price: string;
  nick: string;
  num: string;
  min_num: string;
  detail_url: string;
  pic_url: string;
  brand: string;
  brandId: string;
  rootCatId: string;
  cid: string;
  crumbs: any[];
  created_time: string;
  modified_time: string;
  delist_time: string;
  desc: string;
  desc_img: string[];
  item_imgs: ItemImg[];
  item_weight: string;
  item_size: string;
  location: string;
  post_fee: number;
  express_fee: string;
  ems_fee: string;
  shipping_to: string;
  has_discount: string;
  video: string;
  is_virtual: string;
  sample_id: string;
  is_promotion: string;
  props_name: string;
  prop_imgs: PropImgs;
  property_alias: string;
  props: Prop[];
  total_sold: any;
  skus: Skus;
  seller_id: string;
  sales: number;
  shop_id: string;
  props_list: PropsList;
  seller_info: SellerInfo;
  tmall: string;
  error: string;
  warning: string;
  url_log: any[];
  unit: any;
  is_support_mix: any;
  mix_amount: any;
  mix_begin: any;
  mix_number: any;
  scale: string;
  sellUnit: string;
  props_img: PropsImg;
  sales_data: any;
  _ddf: string;
  sales_info: SalesInfo;
  format_check: string;
  shop_item: any[];
  relate_items: any[];
}

export interface ItemImg {
  url: string;
}

export interface PropImgs {
  prop_img: PropImg[];
}

export interface PropImg {
  properties: string;
  url: string;
}

export interface Prop {
  name: string;
  value: string;
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
}

export interface PropsList {
  '0:0': string;
  '0:1': string;
  '0:2': string;
  '0:3': string;
  '0:4': string;
  '0:5': string;
  '0:6': string;
  '0:7': string;
  '0:8': string;
  '1:0': string;
  '1:1': string;
  '1:2': string;
  '1:3': string;
  '1:4': string;
  '1:5': string;
  '1:6': string;
}

export interface SellerInfo {
  nick: string;
  user_num_id: string;
  sid: string;
  title: string;
  zhuy: string;
  shop_name: string;
}

export interface PropsImg {
  '0:0': string;
  '0:1': string;
  '0:2': string;
  '0:3': string;
  '0:4': string;
  '0:5': string;
  '0:6': string;
  '0:7': string;
  '0:8': string;
}

export interface SalesInfo {
  seller_num: string;
  repeat_rate_purchase: string;
  per_capita_purchases: string;
  comment_num: string;
  comment_url: string;
}
