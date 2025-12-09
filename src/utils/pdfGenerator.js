import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient';

const PACK_SIZES = {
    'FGC': 10, // Cups
    'FGP': 1,  // Pints (Default)
    'FGL': 1,  // Liters (Default)
    'FGG': 1   // Gallons (Default)
};

const PRICE_MAP = {
    'FGC': 23,   // Cup
    'FGP': 85,   // Pint
    'FGL': 170,  // Liter
    'FGG': 680   // Gallon
};

const CATEGORY_ORDER = ['FGC', 'FGP', 'FGL', 'FGG'];
const CATEGORY_NAMES = {
    'FGC': 'CUPS',
    'FGP': 'PINTS',
    'FGL': 'LITERS',
    'FGG': 'GALLONS'
};

const loadImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
};

export const generatePackingList = async (order, inventory, resellerPrices = {}) => {
    const doc = new jsPDF();

    // 1. Header
    try {
        const logo = await loadImage('/logo.png');
        const logoWidth = 50;
        const logoHeight = (logo.height / logo.width) * logoWidth;
        doc.addImage(logo, 'PNG', 15, 5, logoWidth, logoHeight); // Moved up to y=5
    } catch (e) {
        console.error("Error loading logo", e);
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("242 Burgos Street", 15, 45); // Moved down
    doc.text("Brgy San Juan (Roro)", 15, 50);
    doc.text("Sorsogon City", 15, 55);

    // 2. Bill To & Date Section
    doc.setFillColor(150, 150, 150); // Gray
    doc.rect(15, 62, 85, 7, 'F'); // Moved down
    doc.rect(110, 62, 85, 7, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("BILL TO", 17, 67);
    doc.text("DELIVERY DATE", 112, 67);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    // Reseller Info
    doc.text("Reseller Name:", 15, 77); // Moved down
    doc.text(order.resellerName || '', 45, 77);
    doc.line(45, 78, 100, 78);

    doc.text("Reseller Category:", 15, 85);
    doc.text(order.location || '', 48, 85);
    doc.line(48, 86, 100, 86);

    // Date Info
    doc.text("DATE:", 110, 77);
    doc.text(new Date(order.date).toLocaleDateString(), 125, 77);
    doc.line(125, 78, 195, 78);

    // 3. Table Data Preparation
    const tableBody = [];
    let grandTotalBill = 0;

    CATEGORY_ORDER.forEach(prefix => {
        const itemsInGroup = Object.entries(order.items)
            .filter(([sku, qty]) => sku.startsWith(prefix) && qty > 0)
            .map(([sku, qty]) => {
                const itemDef = inventory.find(i => i.sku === sku);

                // Dynamic Price Lookup
                // Check specific category price first, then fallback to base PRICE_MAP
                let price = PRICE_MAP[prefix] || 0;
                if (order.location && resellerPrices && resellerPrices[order.location] && resellerPrices[order.location][prefix]) {
                    price = resellerPrices[order.location][prefix];
                }

                const totalCost = price * qty;
                return {
                    sku,
                    description: itemDef ? itemDef.description : sku,
                    qty,
                    packSize: PACK_SIZES[prefix] || 1,
                    price,
                    totalCost
                };
            });

        if (itemsInGroup.length > 0) {
            // Add items
            itemsInGroup.forEach(item => {
                const numPacks = item.packSize > 1 ? (item.qty / item.packSize).toFixed(1) : '';
                tableBody.push([
                    item.description,
                    numPacks, // Number of Packs
                    item.packSize, // Pcs/Pack
                    item.qty, // Total Quantity
                    `P ${item.price.toLocaleString()}`, // Price
                    `P ${item.totalCost.toLocaleString()}` // Total Cost
                ]);
                grandTotalBill += item.totalCost;
            });

            // Add Total Row for Group
            const totalQty = itemsInGroup.reduce((sum, item) => sum + item.qty, 0);
            tableBody.push([
                {
                    content: `TOTAL # OF ${CATEGORY_NAMES[prefix]} (IN PCS)`,
                    colSpan: 3,
                    styles: {
                        fillColor: [255, 248, 220], // Light yellow/beige
                        fontStyle: 'bold',
                        halign: 'right'
                    }
                },
                {
                    content: totalQty,
                    styles: {
                        fillColor: [255, 248, 220],
                        fontStyle: 'bold',
                        halign: 'center'
                    }
                },
                { content: '', styles: { fillColor: [255, 248, 220] } }, // Empty Price
                { content: '', styles: { fillColor: [255, 248, 220] } }  // Empty Total Cost
            ]);
        }
    });

    // Add Grand Total Row
    tableBody.push([
        {
            content: 'TOTAL BILL',
            colSpan: 5,
            styles: {
                fillColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'right',
                fontSize: 11,
                textColor: [234, 88, 12] // Orange color to match theme
            }
        },
        {
            content: `P ${grandTotalBill.toLocaleString()}`,
            styles: {
                fillColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 11,
                textColor: [234, 88, 12]
            }
        }
    ]);

    // 4. Draw Table
    autoTable(doc, {
        startY: 95, // Moved down
        head: [[
            { content: 'DESCRIPTION', styles: { halign: 'left', fillColor: [128, 128, 128], textColor: 255 } },
            { content: 'NUMBER OF PACKS', styles: { halign: 'center', fillColor: [128, 128, 128], textColor: 255 } },
            { content: 'PCS/PACK', styles: { halign: 'center', fillColor: [128, 128, 128], textColor: 255 } },
            { content: 'TOTAL QUANTITY (IN PCS)', styles: { halign: 'center', fillColor: [128, 128, 128], textColor: 255 } },
            { content: 'PRICE', styles: { halign: 'center', fillColor: [128, 128, 128], textColor: 255 } },
            { content: 'TOTAL COST', styles: { halign: 'center', fillColor: [128, 128, 128], textColor: 255 } }
        ]],
        body: tableBody,
        theme: 'grid',
        styles: {
            fontSize: 9,
            cellPadding: 1.5,
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 30, halign: 'center' }
        },
        didParseCell: function (data) {
            // Dotted lines logic could go here but grid theme is safer for now
        }
    });

    // 5. Footer Signatures
    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);

    const fields = [
        { label: "Date || Time:", y: finalY },
        { label: "Prepared By:", y: finalY + 8 },
        { label: "Date || Time:", y: finalY + 16 },
        { label: "Confirmed By:", y: finalY + 24 }
    ];

    fields.forEach(field => {
        doc.text(field.label, 15, field.y);
        doc.line(45, field.y, 90, field.y); // Left line
    });

    // Right side fields
    doc.text("Date || Time:", 110, finalY);
    doc.line(135, finalY, 180, finalY);

    doc.text("Received By:", 110, finalY + 8);
    doc.line(135, finalY + 8, 180, finalY + 8);

    // Save or Return Blob
    if (order.returnBlob) {
        return doc.output('bloburl');
    } else {
        doc.save(`Packing_List_${order.resellerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    }
};

// New function for Transfer Orders (matches reseller packing list format)
export const generateTransferPackingList = async (order) => {
    const doc = new jsPDF();

    // 1. Header with Logo
    try {
        const logo = await loadImage('/logo.png');
        const logoWidth = 50;
        const logoHeight = (logo.height / logo.width) * logoWidth;
        doc.addImage(logo, 'PNG', 15, 5, logoWidth, logoHeight);
    } catch (e) {
        console.error("Error loading logo", e);
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("242 Burgos Street", 15, 45);
    doc.text("Brgy San Juan (Roro)", 15, 50);
    doc.text("Sorsogon City", 15, 55);

    // 2. Bill To & Delivery Date Section (matching reseller format)
    doc.setFillColor(150, 150, 150);
    doc.rect(15, 62, 85, 7, 'F');
    doc.rect(110, 62, 85, 7, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("BILL TO", 17, 67);
    doc.text("DELIVERY DATE", 112, 67);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    // Reseller/Destination Info
    doc.text("Reseller Name:", 15, 77);
    doc.text(order.destination || order.to_location || '', 45, 77);
    doc.line(45, 78, 100, 78);

    doc.text("Reseller Category:", 15, 85);
    doc.text(order.destination || order.to_location || '', 48, 85);
    doc.line(48, 86, 100, 86);

    // Date Info
    doc.text("DATE:", 110, 77);
    doc.text(new Date(order.date || order.created_at).toLocaleDateString(), 125, 77);
    doc.line(125, 78, 195, 78);

    // 3. Table Data Setup - Group by category like reseller packing list
    const tableBody = [];
    let grandTotalBill = 0;

    // Pack sizes and prices for each category
    const categoryConfig = {
        'Cup': { packSize: 10, price: 23, name: 'CUPS' },
        'Pint': { packSize: 1, price: 85, name: 'PINTS' },
        'Liter': { packSize: 1, price: 170, name: 'LITERS' },
        'Gallon': { packSize: 1, price: 680, name: 'GALLONS' },
        'Other': { packSize: 1, price: 0, name: 'OTHER ITEMS' }
    };

    // Group items by size category
    const groupedItems = {
        'Cup': [],
        'Pint': [],
        'Liter': [],
        'Gallon': [],
        'Other': []
    };

    // Helper function to clean item name (remove "-Default" suffix)
    const cleanItemName = (name) => {
        return name.replace(/-Default$/i, '').trim();
    };

    // Categorize items - supports both item names AND SKU codes
    Object.entries(order.items || {}).forEach(([itemName, qty]) => {
        if (qty > 0) {
            let category = 'Other';
            const lowerName = itemName.toLowerCase();
            const upperName = itemName.toUpperCase();

            // Check for item names containing category keywords
            if (lowerName.includes('cup')) category = 'Cup';
            else if (lowerName.includes('pint')) category = 'Pint';
            else if (lowerName.includes('liter')) category = 'Liter';
            else if (lowerName.includes('gallon')) category = 'Gallon';
            // Also check for SKU prefixes (FGC=Cup, FGP=Pint, FGL=Liter, FGG=Gallon)
            else if (upperName.startsWith('FGC')) category = 'Cup';
            else if (upperName.startsWith('FGP')) category = 'Pint';
            else if (upperName.startsWith('FGL')) category = 'Liter';
            else if (upperName.startsWith('FGG')) category = 'Gallon';

            groupedItems[category].push({
                name: cleanItemName(itemName),
                qty
            });
        }
    });

    // Process each category (in order: Cup, Pint, Liter, Gallon, Other)
    ['Cup', 'Pint', 'Liter', 'Gallon', 'Other'].forEach(category => {
        const items = groupedItems[category];
        const config = categoryConfig[category];

        if (items.length > 0) {
            // Add items
            items.forEach(item => {
                const numPacks = config.packSize > 1 ? (item.qty / config.packSize).toFixed(1) : '';
                const totalCost = config.price * item.qty;
                grandTotalBill += totalCost;

                tableBody.push([
                    item.name,
                    numPacks,
                    config.packSize,
                    item.qty,
                    `P ${config.price.toLocaleString()}`,
                    `P ${totalCost.toLocaleString()}`
                ]);
            });

            // Add category total row
            const categoryTotal = items.reduce((sum, item) => sum + item.qty, 0);
            tableBody.push([
                {
                    content: `TOTAL # OF ${config.name} (IN PCS)`,
                    colSpan: 3,
                    styles: {
                        fillColor: [255, 248, 220],
                        fontStyle: 'bold',
                        halign: 'right'
                    }
                },
                {
                    content: categoryTotal,
                    styles: {
                        fillColor: [255, 248, 220],
                        fontStyle: 'bold',
                        halign: 'center'
                    }
                },
                { content: '', styles: { fillColor: [255, 248, 220] } },
                { content: '', styles: { fillColor: [255, 248, 220] } }
            ]);
        }
    });

    // Add Grand Total Row
    tableBody.push([
        {
            content: 'TOTAL BILL',
            colSpan: 5,
            styles: {
                fillColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'right',
                fontSize: 11,
                textColor: [234, 88, 12]
            }
        },
        {
            content: `P ${grandTotalBill.toLocaleString()}`,
            styles: {
                fillColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 11,
                textColor: [234, 88, 12]
            }
        }
    ]);

    // 4. Draw Table (matching reseller format exactly)
    autoTable(doc, {
        startY: 95,
        head: [[
            { content: 'DESCRIPTION', styles: { halign: 'left', fillColor: [128, 128, 128], textColor: 255 } },
            { content: 'NUMBER OF PACKS', styles: { halign: 'center', fillColor: [128, 128, 128], textColor: 255 } },
            { content: 'PCS/PACK', styles: { halign: 'center', fillColor: [128, 128, 128], textColor: 255 } },
            { content: 'TOTAL QUANTITY (IN PCS)', styles: { halign: 'center', fillColor: [128, 128, 128], textColor: 255 } },
            { content: 'PRICE', styles: { halign: 'center', fillColor: [128, 128, 128], textColor: 255 } },
            { content: 'TOTAL COST', styles: { halign: 'center', fillColor: [128, 128, 128], textColor: 255 } }
        ]],
        body: tableBody,
        theme: 'grid',
        styles: {
            fontSize: 9,
            cellPadding: 1.5,
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 30, halign: 'center' }
        }
    });

    // 5. Footer Signatures (matching reseller format)
    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);

    const fields = [
        { label: "Date || Time:", y: finalY },
        { label: "Prepared By:", y: finalY + 8 },
        { label: "Date || Time:", y: finalY + 16 },
        { label: "Confirmed By:", y: finalY + 24 }
    ];

    fields.forEach(field => {
        doc.text(field.label, 15, field.y);
        doc.line(45, field.y, 90, field.y);
    });

    // Right side fields
    doc.text("Date || Time:", 110, finalY);
    doc.line(135, finalY, 180, finalY);

    doc.text("Received By:", 110, finalY + 8);
    doc.line(135, finalY + 8, 180, finalY + 8);

    // Save or Return Blob
    if (order.returnBlob) {
        return doc.output('bloburl');
    } else {
        const destName = (order.destination || order.to_location || 'Transfer').replace(/\s+/g, '_');
        doc.save(`Packing_List_${destName}_${new Date().toISOString().split('T')[0]}.pdf`);
    }
};

import { COA_DATA, SHELF_LIFE_MONTHS } from './coaData';

export const generateCOA = async (order, bestBeforeDates, inventory) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    const logo = await loadImage('/logo.png');

    // Identify which categories have items
    const activeCategories = CATEGORY_ORDER.filter(prefix => {
        return Object.entries(order.items).some(([sku, qty]) => sku.startsWith(prefix) && qty > 0);
    });

    const totalPages = activeCategories.length;

    // Document Code Logic (Auto-increment) - Using Supabase
    let sequence = 104; // Default starting point

    try {
        // Fetch current sequence from Supabase
        const { data: sequenceData, error: fetchError } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'coa_sequence')
            .single();

        if (fetchError) {
            console.error('Error fetching COA sequence:', fetchError);
            alert('Error loading COA sequence. Using default value.');
        } else if (sequenceData && sequenceData.value !== null) {
            // The value is JSONB, so it's already a number
            sequence = Number(sequenceData.value) + 1;
        }

        // Update sequence in Supabase
        const { error: updateError } = await supabase
            .from('app_settings')
            .update({ value: sequence })
            .eq('key', 'coa_sequence');

        if (updateError) {
            console.error('Error updating COA sequence:', updateError);
            alert('Error saving COA sequence. The PDF will still be generated.');
        }
    } catch (err) {
        console.error('Unexpected error with COA sequence:', err);
        alert('Error with sequence counter: ' + err.message);
    }

    const currentYear = new Date().getFullYear();
    const docCode = `KKK-COA-${currentYear}-${String(sequence).padStart(4, '0')}`;

    for (let i = 0; i < totalPages; i++) {
        const prefix = activeCategories[i];
        if (i > 0) doc.addPage();

        const categoryName = CATEGORY_NAMES[prefix];
        const coaInfo = COA_DATA[prefix];

        // --- Header ---
        // Logo Box
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(15, 10, 85, 35); // Box for logo (Extended height to 35)

        // Logo (Centered in box)
        const logoBoxWidth = 85;
        const logoBoxHeight = 35;
        const logoBoxX = 15;
        const logoBoxY = 10;

        const logoWidth = 60;
        const logoHeight = (logo.height / logo.width) * logoWidth;

        // Center calculation
        const logoX = logoBoxX + (logoBoxWidth - logoWidth) / 2;
        const logoY = logoBoxY + (logoBoxHeight - logoHeight) / 2;

        doc.addImage(logo, 'PNG', logoX, logoY, logoWidth, logoHeight);

        // Title Box
        doc.setDrawColor(0);
        doc.setFillColor(255, 255, 255);
        doc.rect(100, 10, 180, 15); // Title box

        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text("CERTIFICATE OF ANALYSIS", 190, 20, { align: 'center' });

        // Info Box
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);

        // Row 1
        doc.rect(100, 25, 180, 5);
        doc.text(`Doc. Code: ${docCode}`, 102, 29);
        doc.line(170, 25, 170, 30);
        doc.text("Rev.: 00", 172, 29);
        doc.line(200, 25, 200, 30);
        doc.text("Supersedes: 00", 202, 29);
        doc.line(240, 25, 240, 30);
        doc.text(`Page ${i + 1} of ${totalPages}`, 242, 29);

        // Row 2 (Order Date)
        doc.rect(100, 30, 180, 5);
        doc.text(`Order Date: ${new Date(order.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 102, 34);

        // Row 3 & 4 Merged (Reason of Revision)
        doc.rect(100, 35, 180, 10);
        doc.text("Reason of Revision: NA", 102, 39);

        // Reseller Info (with validation)
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Reseller Name:", 15, 50);
        doc.text(order.resellerName || 'N/A', 45, 50);
        doc.line(45, 51, 100, 51);

        doc.text("Reseller Location:", 15, 55);
        doc.text(order.location || 'N/A', 48, 55);
        doc.line(48, 56, 100, 56);

        // --- Table ---
        const tableBody = [];
        let itemIndex = 1;

        // Get items for this category
        const itemsInCategory = Object.entries(order.items)
            .filter(([sku, qty]) => sku.startsWith(prefix) && qty > 0)
            .map(([sku, qty]) => {
                const itemDef = inventory.find(i => i.sku === sku);

                // Handle multiple dates (ensure it's an array)
                const dates = Array.isArray(bestBeforeDates[sku]) ? bestBeforeDates[sku] : [bestBeforeDates[sku] || ''];

                // Calculate production dates and format best before dates
                const productionDates = [];
                const formattedBestBeforeDates = [];

                dates.forEach(dateStr => {
                    if (dateStr) {
                        // Best Before
                        const bbDate = new Date(dateStr);
                        const mm = String(bbDate.getMonth() + 1).padStart(2, '0');
                        const dd = String(bbDate.getDate()).padStart(2, '0');
                        const yy = String(bbDate.getFullYear()).slice(-2);
                        formattedBestBeforeDates.push(`${mm}${dd}${yy}`);

                        // Production Date (3 months prior)
                        const prodDate = new Date(bbDate);
                        prodDate.setMonth(prodDate.getMonth() - 3);
                        const pMm = String(prodDate.getMonth() + 1).padStart(2, '0');
                        const pDd = String(prodDate.getDate()).padStart(2, '0');
                        const pYy = String(prodDate.getFullYear()).slice(-2);
                        productionDates.push(`${pMm}${pDd}${pYy}`);
                    }
                });

                return {
                    sku,
                    description: itemDef ? itemDef.description : sku,
                    qty,
                    productionDate: productionDates.join('\n'),
                    bestBeforeFormatted: formattedBestBeforeDates.join('\n'),
                    sensory: coaInfo.sensory[itemDef?.description] || 'N/A'
                };
            });

        itemsInCategory.forEach(item => {
            const row = [
                `${itemIndex}. ${item.description || 'Unknown Product'}`,
                coaInfo.weight.gross,
                coaInfo.weight.net,
                item.productionDate || '',
                item.bestBeforeFormatted || '',
                item.sensory,
                `${coaInfo.packaging}`,
                coaInfo.conformance
            ];
            tableBody.push(row);
            itemIndex++;
        });

        autoTable(doc, {
            startY: 60,
            head: [[
                { content: 'Flavors', rowSpan: 2, styles: { halign: 'left', fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', valign: 'middle' } },
                { content: 'Weight (GRAMS)', colSpan: 2, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold' } },
                { content: 'Production Date\n(MMDDYY)', rowSpan: 2, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', valign: 'middle' } },
                { content: 'Best Before Date\n(MMDDYY)', rowSpan: 2, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', valign: 'middle' } },
                { content: 'Sensory Attributes', rowSpan: 2, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', valign: 'middle' } },
                { content: 'Packaging Quality', rowSpan: 2, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', valign: 'middle' } },
                { content: 'Quality Conformance', rowSpan: 2, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', valign: 'middle' } }
            ], [
                { content: 'Gross', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold' } },
                { content: 'Net', styles: { halign: 'center', fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold' } }
            ]],
            body: tableBody,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                lineColor: [0, 0, 0],
                lineWidth: 0.5
            },
            columnStyles: {
                0: { cellWidth: 50, halign: 'left' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 25, halign: 'center' },
                5: { cellWidth: 60, halign: 'left', fontSize: 7 },
                6: { cellWidth: 30, halign: 'center', fontSize: 7 },
                7: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
            }
        });

        // Notes Section
        const notesY = doc.lastAutoTable.finalY + 5;
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(0);
        doc.text("Notes:", 15, notesY);
        doc.text("•   Storage Requirement: Keep frozen to at least -18°C or lower", 20, notesY + 3);
        doc.text("•   Vanilla Langka visually have minimal tiny black dots from ground vanilla bean paste", 20, notesY + 6);
        doc.text("•   Suman at Mangga may or may not have some minimal black dots from toasted glutinous rice flour.", 20, notesY + 9);
        doc.text("•   During receiving, client must inspect all products according to the analysis criteria above, any quality concerns not documented at time of delivery will not be accepted for claims", 20, notesY + 12);

        // Signature Box (positioned after notes)
        const sigY = Math.max(notesY + 20, 160);
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(15, sigY, 267, 20);
        doc.line(148, sigY, 148, sigY + 20); // Middle vertical
        doc.line(15, sigY + 5, 282, sigY + 5); // Header separator

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Prepared and Checked by:", 17, sigY + 3.5);
        doc.text("Received and Conformed by:", 150, sigY + 3.5);

        doc.setFontSize(10);
        doc.setTextColor(0);
        // Use preparedBy from data arg (bestBeforeDates/coaData) or fallback to order.coaData or blank
        const preparedByName = bestBeforeDates.preparedBy || order.coaData?.preparedBy || '';
        doc.text(preparedByName.toUpperCase(), 81, sigY + 13, { align: 'center' });

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.line(15, sigY + 15, 282, sigY + 15); // Date separator

        // Use preparedDate from data arg or fallback
        const preparedDateVal = bestBeforeDates.preparedDate || order.coaData?.preparedDate;
        const dateStr = preparedDateVal ? new Date(preparedDateVal).toLocaleDateString() : '';
        doc.text(`Date: ${dateStr}`, 17, sigY + 18.5);
    }

    if (order.returnBlob) {
        return doc.output('bloburl');
    } else {
        doc.save(`COA_${order.resellerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    }
};
