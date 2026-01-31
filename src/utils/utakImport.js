// Utak CSV Import Utility
// Handles parsing Utak CSV exports and matching to SKU codes

// SKU System:
// FGC = Cups, FGP = Pints, FGL = Liters, FGG = Gallons, FGT = Trays
// 001 = Cafe Mocha, 002 = Mango Peach Pie Crust, 003 = Milky Chocolate
// 004 = Suman at Mangga, 005 = Vanilla Langka

// Branch email mapping (from Utak exports)
const BRANCH_EMAIL_MAPPING = {
    'kikiksphilippines.finance@gmail.com': 'Ayala Legazpi',
    'firstthingsfirst.ph@gmail.com': 'SM Legazpi',
    'kikiksphilippines@gmail.com': 'SM Sorsogon'
};

const FLAVOR_MAPPING = {
    'cafe mocha': '001',
    'mango peach pie crust': '002',
    'milky chocolate': '003',
    'suman at mangga': '004',
    'vanilla langka': '005',
    'strawberry cheesecake': '006'
};

const SIZE_MAPPING = {
    'cup': 'FGC',
    'cups': 'FGC',
    'pint': 'FGP',
    'pints': 'FGP',
    '1l': 'FGL',
    'liter': 'FGL',
    'liters': 'FGL',
    '1gal': 'FGG',
    'gallon': 'FGG',
    'gallons': 'FGG',
    'tray': 'FGT',
    'trays': 'FGT'
};

/**
 * Detect branch location from filename
 * Example: "kikiksphilippines.finance@gmail.com Inventory for 2026-01-03.csv"
 */
export const detectBranchFromFilename = (filename) => {
    if (!filename) return null;

    const lowerFilename = filename.toLowerCase();

    // Check each email pattern
    for (const [email, branch] of Object.entries(BRANCH_EMAIL_MAPPING)) {
        if (lowerFilename.includes(email.toLowerCase())) {
            return branch;
        }
    }

    // Fallback: check for branch names directly in filename
    if (lowerFilename.includes('ayala')) return 'Ayala Legazpi';
    if (lowerFilename.includes('sorsogon')) return 'SM Sorsogon';
    if (lowerFilename.includes('legazpi') && lowerFilename.includes('firstthings')) return 'SM Legazpi';

    return null;
};

/**
 * Extract inventory date from filename
 * Example: "Inventory for 2026-01-03.csv" -> "2026-01-03"
 */
export const detectDateFromFilename = (filename) => {
    if (!filename) return null;

    // Match date patterns: YYYY-MM-DD or YYYY/MM/DD or YYYYMMDD
    const datePatterns = [
        /(\d{4})-(\d{2})-(\d{2})/,  // 2026-01-03
        /(\d{4})\/(\d{2})\/(\d{2})/, // 2026/01/03
        /(\d{4})(\d{2})(\d{2})/      // 20260103
    ];

    for (const pattern of datePatterns) {
        const match = filename.match(pattern);
        if (match) {
            const [_, year, month, day] = match;
            return `${year}-${month}-${day}`;
        }
    }

    return null;
};

/**
 * Parse CSV text into array of objects
 */
export const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header.toLowerCase()] = values[index];
            });
            data.push(obj);
        }
    }

    return data;
};

/**
 * Parse a single CSV line, handling quoted values
 */
const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
};

/**
 * Match Utak product name to SKU code
 * Example: "Vanilla Langka | cup" -> "FGC-005"
 */
export const matchToSKU = (productTitle) => {
    if (!productTitle) return null;

    const title = productTitle.toLowerCase().trim();

    // Extract flavor and size from title
    let flavor = null;
    let size = null;

    // Check each flavor
    for (const [flavorName, flavorCode] of Object.entries(FLAVOR_MAPPING)) {
        if (title.includes(flavorName)) {
            flavor = flavorCode;
            break;
        }
    }

    // Check each size
    for (const [sizeName, sizePrefix] of Object.entries(SIZE_MAPPING)) {
        if (title.includes(sizeName)) {
            size = sizePrefix;
            break;
        }
    }

    // If both flavor and size found, construct SKU
    if (flavor && size) {
        return `${size}-${flavor}`;
    }

    return null;
};

/**
 * Process Utak CSV data and match to SKUs
 */
export const processUtakImport = (csvData) => {
    const matched = [];
    const unmatched = [];

    csvData.forEach(row => {
        const title = row.title || row.product || row.description || '';
        const category = row.category || '';
        const endStock = parseInt(row.end || row['end stock'] || row.ending || 0);

        const sku = matchToSKU(title);

        const item = {
            utakTitle: title,
            category: category,
            endStock: endStock,
            sku: sku,
            rawData: row
        };

        if (sku) {
            matched.push(item);
        } else {
            // Only add to unmatched if it's an ice cream product
            const lowerTitle = title.toLowerCase();
            const isIceCream =
                lowerTitle.includes('cup') ||
                lowerTitle.includes('pint') ||
                lowerTitle.includes('liter') ||
                lowerTitle.includes('gallon') ||
                lowerTitle.includes('tray') ||
                category.toLowerCase().includes('cup') ||
                category.toLowerCase().includes('pint') ||
                category.toLowerCase().includes('gallon');

            if (isIceCream) {
                unmatched.push(item);
            }
        }
    });

    return { matched, unmatched };
};

/**
 * Get all available SKUs with descriptions
 */
export const getAvailableSKUs = () => {
    const skus = [];
    const sizes = ['FGC', 'FGP', 'FGL', 'FGG', 'FGT'];
    const flavors = {
        '001': 'Cafe Mocha',
        '002': 'Mango Peach Pie Crust',
        '003': 'Milky Chocolate',
        '004': 'Suman at Mangga',
        '005': 'Vanilla Langka',
        '006': 'Strawberry Cheesecake'
    };

    const sizeNames = {
        'FGC': 'Cup',
        'FGP': 'Pint',
        'FGL': 'Liter',
        'FGG': 'Gallon',
        'FGT': 'Tray'
    };

    sizes.forEach(size => {
        Object.entries(flavors).forEach(([code, name]) => {
            skus.push({
                sku: `${size}-${code}`,
                description: `${name} ${sizeNames[size]}`
            });
        });
    });

    return skus;
};

/**
 * Validate import data before submitting
 */
export const validateImportData = (matched, branch) => {
    const errors = [];

    if (!branch) {
        errors.push('Branch location is required');
    }

    if (matched.length === 0) {
        errors.push('No products matched to SKUs');
    }

    matched.forEach((item, index) => {
        if (!item.sku) {
            errors.push(`Item ${index + 1}: Missing SKU`);
        }
        if (item.endStock < 0) {
            errors.push(`Item ${index + 1} (${item.sku}): Stock cannot be negative`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};
