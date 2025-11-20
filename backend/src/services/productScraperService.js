import axios from 'axios';
import * as cheerio from 'cheerio';

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
        color: '.product-color',
        image: '.product-image img',
        brand: 'H&M'
    }
};

const getDomainFromUrl = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '').replace(/.*\./, '') + '.com';
    } catch {
        return null;
    }
};

const extractPrice = (priceText) => {
    if (!priceText) return 0;
    const cleanPrice = priceText.replace(/[^0-9.]/g, '');
    const price = parseFloat(cleanPrice);
    return isNaN(price) ? 0 : price;
};

const guessCategory = (name) => {
    const lowerName = name.toLowerCase();
    if (/shirt|blouse|tee|top|sweater/.test(lowerName)) return 'tops';
    if (/pants|jeans|shorts|skirt/.test(lowerName)) return 'bottoms';
    if (/shoe|sneaker|boot/.test(lowerName)) return 'shoes';
    if (/jacket|coat/.test(lowerName)) return 'outerwear';
    if (/hat|scarf|bag/.test(lowerName)) return 'accessories';
    return 'tops';
};

export const scrapeProductInfo = async (productUrl) => {
    const domain = getDomainFromUrl(productUrl);
    const config = SITE_CONFIGS[domain];
    
    if (!config) {
        return {
            name: 'Imported Item',
            category: 'tops',
            item_url: productUrl,
            scraped_successfully: false
        };
    }
    
    try {
        const response = await axios.get(productUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        
        const name = $(config.name).first().text().trim() || 'Unknown Item';
        const priceText = $(config.price).first().text().trim();
        const color = $(config.color).first().text().trim() || '';
        
        let imageUrl = $(config.image).first().attr('src');
        if (imageUrl && !imageUrl.startsWith('http')) {
            const baseUrl = new URL(productUrl).origin;
            imageUrl = baseUrl + imageUrl;
        }
        
        let imageData = null;
        if (imageUrl) {
            try {
                const imgResponse = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 5000
                });
                const base64 = Buffer.from(imgResponse.data).toString('base64');
                imageData = `data:image/jpeg;base64,${base64}`;
            } catch (err) {
                console.log('Failed to fetch image:', err.message);
            }
        }
        
        return {
            name: name.substring(0, 100),
            brand: config.brand,
            price: extractPrice(priceText),
            color: color,
            category: guessCategory(name),
            item_url: productUrl,
            image_data: imageData,
            scraped_successfully: true
        };
        
    } catch (error) {
        console.error('Scraping error:', error.message);
        return {
            name: 'Imported Item',
            brand: config.brand,
            category: 'tops',
            item_url: productUrl,
            scraped_successfully: false
        };
    }
};

export const isValidProductUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};
