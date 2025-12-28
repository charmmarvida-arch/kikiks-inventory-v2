import * as XLSX from 'xlsx';

/**
 * Export inventory data to Excel format
 * @param {Array} data - Inventory data to export
 * @param {Array} columns - Column configuration
 * @param {Object} settings - Export settings (company name, title, etc.)
 */
export const exportToExcel = (data, columns, settings = {}) => {
    try {
        // Prepare worksheet data
        const wsData = [];

        // Add header rows if configured
        if (settings.companyName) {
            wsData.push([settings.companyName]);
            wsData.push([]);
        }
        if (settings.reportTitle) {
            wsData.push([settings.reportTitle]);
            wsData.push([`Generated: ${new Date().toLocaleDateString()}`]);
            wsData.push([]);
        }

        // Add column headers
        const headers = columns.map(col => col.label);
        wsData.push(headers);

        // Add data rows
        data.forEach(item => {
            const row = columns.map(col => {
                const value = col.getValue ? col.getValue(item) : item[col.key];
                // Format currency values
                if (col.format === 'currency' && typeof value === 'number') {
                    return value;
                }
                return value;
            });
            wsData.push(row);
        });

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        const colWidths = columns.map(col => ({ wch: col.width || 15 }));
        ws['!cols'] = colWidths;

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

        // Generate filename
        const filename = `FTF_Manufacturing_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Download file
        XLSX.writeFile(wb, filename);

        return { success: true, filename };
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Export inventory data to CSV format
 * @param {Array} data - Inventory data to export
 * @param {Array} columns - Column configuration
 * @param {Object} settings - Export settings
 */
export const exportToCSV = (data, columns, settings = {}) => {
    try {
        let csvContent = '';

        // Add header rows if configured
        if (settings.companyName) {
            csvContent += `${settings.companyName}\n\n`;
        }
        if (settings.reportTitle) {
            csvContent += `${settings.reportTitle}\n`;
            csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
        }

        // Add column headers
        const headers = columns.map(col => col.label).join(',');
        csvContent += headers + '\n';

        // Add data rows
        data.forEach(item => {
            const row = columns.map(col => {
                const value = col.getValue ? col.getValue(item) : item[col.key];
                // Handle values with commas or quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvContent += row.join(',') + '\n';
        });

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const filename = `FTF_Manufacturing_${new Date().toISOString().split('T')[0]}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true, filename };
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Format inventory data based on export settings
 * @param {Array} inventory - Raw inventory data
 * @param {Object} columnSettings - Which columns to include
 * @param {Object} priceSettings - SRP and COGS prices
 */
export const formatInventoryData = (inventory, columnSettings, priceSettings = {}) => {
    const { srp = {}, cogs = {} } = priceSettings;

    return inventory.map(item => {
        const prefix = item.sku.split('-')[0];
        const itemSRP = srp[prefix] || 0;
        const itemCOGS = cogs[prefix] || 0;
        const profitMargin = itemSRP - itemCOGS;
        const totalValue = itemSRP * item.quantity;
        const totalCost = itemCOGS * item.quantity;

        return {
            ...item,
            srp: itemSRP,
            cogs: itemCOGS,
            profitMargin,
            totalValue,
            totalCost,
        };
    });
};

/**
 * Get column configuration for export
 * @param {Object} columnSettings - Which columns to include
 */
export const getExportColumns = (columnSettings) => {
    const allColumns = [
        { key: 'sku', label: 'SKU', width: 15, enabled: true },
        { key: 'description', label: 'Product Description', width: 30, enabled: true },
        { key: 'uom', label: 'UOM', width: 10, enabled: true },
        { key: 'quantity', label: 'Current Stock', width: 12, enabled: true },
        {
            key: 'srp',
            label: 'SRP',
            width: 12,
            enabled: columnSettings?.showSRP,
            format: 'currency',
            getValue: (item) => item.srp
        },
        {
            key: 'cogs',
            label: 'Cost of Goods',
            width: 12,
            enabled: columnSettings?.showCOGS,
            format: 'currency',
            getValue: (item) => item.cogs
        },
        {
            key: 'profitMargin',
            label: 'Profit Margin',
            width: 12,
            enabled: columnSettings?.showProfitMargin,
            format: 'currency',
            getValue: (item) => item.profitMargin
        },
        {
            key: 'totalValue',
            label: 'Total Value (SRP)',
            width: 15,
            enabled: columnSettings?.showTotalValue,
            format: 'currency',
            getValue: (item) => item.totalValue
        },
        {
            key: 'totalCost',
            label: 'Total Cost (COGS)',
            width: 15,
            enabled: columnSettings?.showTotalCost,
            format: 'currency',
            getValue: (item) => item.totalCost
        },
        {
            key: 'productionDate',
            label: 'Production Date',
            width: 15,
            enabled: columnSettings?.showProductionDate,
            getValue: (item) => item.productionDate || 'N/A'
        },
    ];

    return allColumns.filter(col => col.enabled);
};
