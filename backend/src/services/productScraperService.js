import axios from 'axios';
import * as cheerio from 'cheerio';

// サイトごとの追加セレクタ（効けばラッキーぐらいの位置づけ）
const SITE_CONFIGS = {
  'uniqlo.com': {
    name: 'h1.heading-primary, .product-name',
    price: '.price-value',
    color: '.color-name',
    image: '.product-image img',
    brand: 'Uniqlo'
  },
  'zara.com': {
    name: 'h1.product-detail-info__header-name',
    price: '.price__amount-current',
    color: '.product-detail-selected-color',
    image: '.media-image__image',
    brand: 'ZARA'
  },
  'hm.com': {
    name: 'h1.product-item-headline',
    price: '.price-value',
    color: '.product-color, .ProductDescription-module--colorName--*',
    image: '.product-image img, .product-detail-main-image-container img',
    brand: 'H&M'
  },
  'amazon.com': {
    name: '#productTitle',
    price:
      '#corePrice_feature_div span.a-offscreen, #priceblock_ourprice, #priceblock_dealprice',
    color: '#variation_color_name .selection',
    image: '#imgTagWrapperId img, #landingImage',
    brand: '#bylineInfo'
  }
};

const getSiteConfig = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');

    for (const [pattern, config] of Object.entries(SITE_CONFIGS)) {
      if (hostname.endsWith(pattern)) {
        return config;
      }
    }
    return null;
  } catch {
    return null;
  }
};

const extractPrice = (priceText) => {
  if (!priceText) return 0;
  const cleanPrice = priceText.replace(/[^0-9.]/g, '');
  const price = parseFloat(cleanPrice);
  return Number.isNaN(price) ? 0 : price;
};

const guessCategory = (name) => {
  const lowerName = name.toLowerCase();
  if (/shirt|blouse|tee|t-shirt|top|sweater/.test(lowerName)) return 'tops';
  if (/pants|jeans|shorts|skirt|trousers/.test(lowerName)) return 'bottoms';
  if (/shoe|sneaker|boot|loafer/.test(lowerName)) return 'shoes';
  if (/jacket|coat|parka|blazer/.test(lowerName)) return 'outerwear';
  if (/hat|scarf|bag|belt/.test(lowerName)) return 'accessories';
  return 'tops';
};

// 汎用的な meta タグから取るやつ
const scrapeFromMetaTags = ($, productUrl) => {
  const ogTitle =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    '';

  const ogImage =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    '';

  const ogPrice =
    $('meta[property="product:price:amount"]').attr('content') ||
    $('meta[property="og:price:amount"]').attr('content') ||
    '';

  const name =
    ogTitle ||
    $('meta[name="title"]').attr('content') ||
    $('title').text().trim() ||
    'Imported Item';

  const price = extractPrice(ogPrice);
  let imageUrl = ogImage;

  if (!imageUrl) {
    // どうしてもなければ最初の <img> を拝借
    imageUrl = $('img').first().attr('src') || '';
  }

  if (imageUrl && !imageUrl.startsWith('http')) {
    try {
      const base = new URL(productUrl).origin;
      imageUrl = base + imageUrl;
    } catch {
      // 無視
    }
  }

  return { name, price, imageUrl };
};

// 画像URL → base64
const downloadImageAsBase64 = async (imageUrl) => {
  const res = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 5000
  });

  const contentType = res.headers['content-type'] || 'image/jpeg';
  const base64 = Buffer.from(res.data, 'binary').toString('base64');
  return `data:${contentType};base64,${base64}`;
};

export const scrapeProductInfo = async (productUrl) => {
  let config = getSiteConfig(productUrl);

  try {
    const response = await axios.get(productUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // まず meta タグから共通情報を取る
    const metaResult = scrapeFromMetaTags($, productUrl);
    let { name, price, imageUrl } = metaResult;

    // 対応サイトなら、専用セレクタで「上書き」してみる
    if (config) {
      const nameFromConfig = $(config.name).first().text().trim();
      const priceText = $(config.price).first().text().trim();
      const colorFromConfig = $(config.color).first().text().trim();
      let imageFromConfig = $(config.image).first().attr('src');

      if (nameFromConfig) name = nameFromConfig;
      if (priceText) price = extractPrice(priceText);

      let color = colorFromConfig || '';

      // 画像URLの組み立て
      if (imageFromConfig) {
        if (!imageFromConfig.startsWith('http')) {
          const base = new URL(productUrl).origin;
          imageFromConfig = base + imageFromConfig;
        }
        imageUrl = imageFromConfig;
      }

      // 画像をbase64に
      let imageData = null;
      if (imageUrl) {
        try {
          imageData = await downloadImageAsBase64(imageUrl);
        } catch (err) {
          console.log('Image download failed:', err.message);
        }
      }

      return {
        name: name.substring(0, 100),
        brand: typeof config.brand === 'string' ? config.brand : '',
        price,
        color,
        category: guessCategory(name),
        item_url: productUrl,
        image_data: imageData,
        scraped_successfully: true
      };
    }

    // 対応サイトじゃない場合も、metaタグ+汎用でできるだけ頑張る
    let imageData = null;
    if (imageUrl) {
      try {
        imageData = await downloadImageAsBase64(imageUrl);
      } catch (err) {
        console.log('Image download failed:', err.message);
      }
    }

    return {
      name: name.substring(0, 100),
      brand: '',
      price,
      color: '',
      category: guessCategory(name),
      item_url: productUrl,
      image_data: imageData,
      scraped_successfully: true
    };
  } catch (error) {
    console.error('Scraping error:', error.message);
    return {
      name: 'Imported Item',
      brand: '',
      price: 0,
      color: '',
      category: 'tops',
      item_url: productUrl,
      image_data: null,
      scraped_successfully: false
    };
  }
};

export const isValidProductUrl = (url) => {
  try {
    // 形式がURLっぽいかだけチェック（ドメイン制限はしない）
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
