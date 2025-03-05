export interface IContentImageResponse {
    total_items: number
    items: Items
    total: number
    num_pages: number
    search_page: number
    is_csam_search: boolean
    uss_instrumentation: any
    contributor_redirect: any[]
    facets: Facets
    available_asset_types: string[]
    asset_type_links: AssetTypeLink[]
}

export interface Items {
    [key: string]: IContentImage
}

export interface IContentImage {
    id32: string
    content_id: number
    title: string
    content_type_id: number
    content_type: string
    content_thumb_large_url: string
    content_thumb_extra_large_url: string
    content_original_height: number
    content_original_width: number
    format: string
    comp_file_path: string
    author: string
    creator_id: number
    content_url: string
    content_path: string
    is_purchasable: boolean
    is_template: boolean
    is_chin_below: boolean
    is_video: boolean
    is_3D: boolean
    is_image: boolean
    is_vector: boolean
    is_audio: boolean
    is_illustrative: boolean
    is_similar_id: boolean
    is_similarity_search_allowed: boolean
    is_offensive: boolean
    possible_licenses: number[]
    asset_type: string
    category: Category
    premium_level: PremiumLevel
    premium_level_id: number
    is_lazy_loaded: boolean
    can_license_with_cct_pro: boolean
    file_extension: string
    microdata_itemtype: string
    is_transparent: boolean
    is_gentech: boolean
    offensive_level: number
    is_panoramic: boolean
    thumbnail_url: string
    thumbnail_width: number
    thumbnail_height: number
    getSubtypeLabel: any
    is_licensed: boolean
    media_type_label: string
    video_small_preview_url: any
    order_key: number
    category_hierarchy: string
    is_free: boolean
    is_firefly_generated: boolean
    avatar: any
    artist_page_url: string
    content_supported_by_ccxqa: boolean
    is_premium: boolean
    thumbnail_url_webp: string
    extended_license_price: string
    default_license_id: number
    license_details: LicenseDetails
    is_allowed_and_purchasable: boolean
    is_quotable: boolean
    is_not_allowed_by_org_admin: boolean
    is_standard: boolean
    is_eligible_for_buy_choice: boolean
    is_extended_plan_eligible: boolean
}

export interface Category {
    id: number
    name: string
}

export interface PremiumLevel {
    "1": string
    "2": string
}

export interface LicenseDetails {
    [key :string]: LicenseDetail
}


export interface Facets {
    asset_type: AssetType
    stock_price_tiers: StockPriceTiers
    stock_editorial: StockEditorial
}

export interface AssetType {
    image: number
}

export interface StockPriceTiers {
    standard: number
    premium: number
}

export interface StockEditorial {
    true: number
    false: number
}

export interface AssetTypeLink {
    text: string
    route: string
}

//// BY ID

export interface IContentImageByIdResponse {
    keywords: string[]
    id32: string
    content_id: number
    title: string
    content_type_id: number
    content_type: string
    content_thumb_url: string
    content_thumb_large_url: string
    content_height: number
    content_width: number
    content_thumb_extra_large_url: string
    content_original_height: number
    content_original_width: number
    format: string
    comp_file_path: string
    author: string
    creator_id: number
    author_url: string
    content_url: string
    content_path: string
    is_purchasable: boolean
    is_template: boolean
    is_chin_below: boolean
    is_video: boolean
    is_3D: boolean
    is_image: boolean
    is_vector: boolean
    is_audio: boolean
    is_illustrative: boolean
    is_similar_id: boolean
    is_similarity_search_allowed: boolean
    is_offensive: boolean
    possible_licenses: number[]
    asset_type: string
    category: Category
    premium_level: PremiumLevel
    premium_level_id: number
    meta_description: string
    is_rush_mobile_compatible: boolean
    is_lazy_loaded: boolean
    can_license_with_cct_pro: boolean
    file_extension: string
    microdata_itemtype: boolean
    is_transparent: boolean
    is_gentech: boolean
    offensive_level: number
    is_panoramic: boolean
    thumbnail_url: string
    thumbnail_width: number
    thumbnail_height: number
    getSubtypeLabel: any
    is_licensed: boolean
    media_type_label: string
    video_small_preview_url: any
    order_key: any
    category_hierarchy: string
    is_free: boolean
    is_firefly_generated: boolean
    avatar: string
    artist_page_url: string
    content_supported_by_ccxqa: boolean
    is_premium: boolean
    thumbnail_url_webp: string
    extended_license_price: string
    downloaded: boolean
    default_license_id: number
    license_details: LicenseDetails
    is_allowed_and_purchasable: boolean
    is_quotable: boolean
    is_not_allowed_by_org_admin: boolean
    is_standard: boolean
    is_eligible_for_buy_choice: boolean
    is_extended_plan_eligible: boolean
    org_model_data: any[]
  }
  
  export interface Category {
    id: number
    name: string
  }
  
  export interface PremiumLevel {
    "1": string
    "2": string
  }
  
  export interface LicenseDetails {
    [key: number]: LicenseDetail
  }
  
  export interface LicenseDetail {
    product_key: string
    license_price: string
    facing_price: string
    user_facing_detail_panel_license_tab_label: string
    user_facing_license_type_label: string
    license_type_label: string
    downloaded: boolean
  }
  