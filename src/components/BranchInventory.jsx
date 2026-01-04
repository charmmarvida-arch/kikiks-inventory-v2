import React, { useState } from 'react';
import { useBranchInventory } from '../context/BranchInventoryContext';
import { Upload, Search, BarChart3, X, AlertCircle, CheckCircle, FileText, AlertTriangle, Printer, DollarSign } from 'lucide-react';
import { parseCSV, processUtakImport, getAvailableSKUs, validateImportData, detectBranchFromFilename, detectDateFromFilename } from '../utils/utakImport';
import { Settings } from 'lucide-react';
import Toast from './Toast';
import BranchCapacitySettings from './BranchCapacitySettings';
import BranchPriceSettings from './BranchPriceSettings';

const BranchInventory = () => {
    const {
        branchInventory,
        capacitySettings,
        importLogs,
        loading,
        importUtakData,
        getBranchInventory,
        setCapacity,
        fetchBranchData
    } = useBranchInventory();

    const [selectedBranch, setSelectedBranch] = useState('SM Sorsogon');
    const [searchTerm, setSearchTerm] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Import state
    const [importStep, setImportStep] = useState('upload'); // 'upload', 'preview', 'processing', 'complete'
    const [selectedFile, setSelectedFile] = useState(null);
    const [csvData, setCsvData] = useState(null);
    const [matchedProducts, setMatchedProducts] = useState([]);
    const [unmatchedProducts, setUnmatchedProducts] = useState([]);
    const [manualMappings, setManualMappings] = useState({});
    const [importProgress, setImportProgress] = useState(null);
    const [detectedBranch, setDetectedBranch] = useState(null);
    const [detectedDate, setDetectedDate] = useState(null);
    const [branchMismatch, setBranchMismatch] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isPriceSettingsModalOpen, setIsPriceSettingsModalOpen] = useState(false);
    const [capacityEdits, setCapacityEdits] = useState({});
    const [showToast, setShowToast] = useState(false);

    const branches = ['SM Sorsogon', 'SM Legazpi', 'Ayala Legazpi'];

    const branchData = getBranchInventory(selectedBranch);
    const filteredData = branchData.filter(item =>
        item.product_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const lastImport = importLogs.find(log => log.branch_location === selectedBranch);

    // Handle file selection
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Detect branch and date from filename
        const detectedBranchName = detectBranchFromFilename(file.name);
        const detectedInventoryDate = detectDateFromFilename(file.name);

        setDetectedBranch(detectedBranchName);
        setDetectedDate(detectedInventoryDate);

        // Check for mismatch
        const isMismatch = detectedBranchName && detectedBranchName !== selectedBranch;
        setBranchMismatch(isMismatch);

        setSelectedFile(file);
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const parsed = parseCSV(text);
                const { matched, unmatched } = processUtakImport(parsed);

                setCsvData(parsed);
                setMatchedProducts(matched);
                setUnmatchedProducts(unmatched);
                setImportStep('preview');
            } catch (error) {
                console.error('Error parsing CSV:', error);
                alert('Error parsing CSV file. Please check the file format.');
            }
        };

        reader.readAsText(file);
    };

    // Handle manual SKU assignment for unmatched products
    const handleManualMapping = (utakTitle, sku) => {
        setManualMappings(prev => ({
            ...prev,
            [utakTitle]: sku
        }));
    };

    // Process import
    const handleConfirmImport = async () => {
        try {
            setImportStep('processing');

            // Combine matched products with manually mapped ones
            const finalMatched = [...matchedProducts];

            unmatchedProducts.forEach(item => {
                const manualSku = manualMappings[item.utakTitle];
                if (manualSku) {
                    finalMatched.push({
                        ...item,
                        sku: manualSku
                    });
                }
            });

            // Validate (use detected branch if available)
            const branchToUse = detectedBranch || selectedBranch;
            const validation = validateImportData(finalMatched, branchToUse);
            if (!validation.isValid) {
                alert('Validation errors:\n' + validation.errors.join('\n'));
                setImportStep('preview');
                return;
            }

            // Create mappings object for import
            const mappings = {};
            finalMatched.forEach(item => {
                mappings[item.utakTitle] = item.sku;
            });

            // Import to database
            const result = await importUtakData(branchToUse, csvData, mappings);

            setImportProgress(result);
            setImportStep('complete');

        } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import: ' + error.message);
            setImportStep('preview');
        }
    };

    // Reset import modal
    const closeImportModal = () => {
        setIsImportModalOpen(false);
        setImportStep('upload');
        setSelectedFile(null);
        setCsvData(null);
        setMatchedProducts([]);
        setUnmatchedProducts([]);
        setManualMappings({});
        setDetectedBranch(null);
        setDetectedDate(null);
        setBranchMismatch(false);
        setImportProgress(null);
    };

    const availableSKUs = getAvailableSKUs();

    return (
        <div className="fade-in h-screen flex flex-col bg-[#F3EBD8] overflow-hidden">
            {/* Header */}
            <div className="bg-[#F3EBD8] px-8 py-6 border-b border-[#510813]/10">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-[#510813] tracking-tight">
                            BRANCH INVENTORY
                        </h1>
                        <p className="text-[#510813]/60 font-medium">
                            Track stock levels across Kikiks branches
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsPriceSettingsModalOpen(true)}
                            className="flex items-center gap-2 bg-white text-[#510813] hover:bg-gray-100 border-2 border-[#510813]/20 px-4 py-3 rounded-full font-bold shadow-md transition-all"
                        >
                            <DollarSign size={20} className="text-[#E5562E]" />
                            <span>Price Settings</span>
                        </button>
                        <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="flex items-center gap-2 bg-[#510813] hover:bg-[#3d0610] text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all"
                        >
                            <Settings size={20} />
                            <span>Capacity Settings</span>
                        </button>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 bg-[#E5562E] hover:bg-[#c94925] text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all"
                        >
                            <Upload size={20} />
                            <span>Import Utak CSV</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Branch Selector & Stats */}
            <div className="px-8 py-4 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                        {branches.map(branch => (
                            <button
                                key={branch}
                                onClick={() => setSelectedBranch(branch)}
                                className={`px-6 py-2 rounded-full font-bold transition-all ${selectedBranch === branch
                                    ? 'bg-[#510813] text-white shadow-lg'
                                    : 'bg-gray-100 text-[#510813]/60 hover:bg-gray-200'
                                    }`}
                            >
                                {branch}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => window.open(`/print-stocks/${encodeURIComponent(selectedBranch)}`, '_blank')}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-[#510813] px-4 py-2 rounded-lg font-bold transition-all"
                        title="Print Audit List"
                    >
                        <Printer size={18} />
                        <span className="hidden md:inline">Print Stock List</span>
                    </button>
                </div>

                <div className="flex justify-end pt-2">
                    {lastImport && (
                        <div className="text-sm text-gray-600">
                            <span className="font-bold">Last Import:</span>{' '}
                            {new Date(lastImport.import_date).toLocaleString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-8 py-4 bg-white border-b border-gray-200">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#E5562E] focus:ring-4 focus:ring-[#E5562E]/20 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Inventory Table */}
            <div className="flex-1 overflow-auto px-8 py-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-[#510813]/60">Loading...</div>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#510813]/40">
                        <BarChart3 size={64} className="mb-4" />
                        <p className="text-xl font-bold">No inventory data yet</p>
                        <p className="text-sm mt-2">Import a Utak CSV to get started</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-[#510813] text-white">
                                <tr>
                                    <th className="text-left p-4 font-bold">SKU</th>
                                    <th className="text-left p-4 font-bold">Product</th>
                                    <th className="text-left p-4 font-bold">Category</th>
                                    <th className="text-center p-4 font-bold">Current Stock</th>
                                    <th className="text-center p-4 font-bold">Last Updated</th>
                                    <th className="text-center p-4 font-bold">Source</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredData.map(item => (
                                    <tr key={item.id} className="hover:bg-[#F3EBD8]/30 transition-colors">
                                        <td className="p-4">
                                            <span className="font-mono text-sm font-bold text-[#510813]">
                                                {item.sku}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-bold text-gray-800">
                                                {item.product_description}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm text-gray-600">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${item.current_stock > 50 ? 'bg-green-100 text-green-700' :
                                                item.current_stock > 20 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {item.current_stock}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-sm text-gray-600">
                                            {item.last_sync_date ?
                                                new Date(item.last_sync_date).toLocaleDateString() :
                                                '-'
                                            }
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                                                {item.last_sync_source || 'manual'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <div>
                                <h2 className="text-2xl font-black text-[#510813]">
                                    Import Utak CSV - {selectedBranch}
                                </h2>
                                {detectedBranch && detectedDate && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        📅 File Date: {detectedDate}
                                        {detectedBranch && ` • Detected: ${detectedBranch}`}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={closeImportModal}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Branch Mismatch Warning */}
                        {branchMismatch && importStep === 'preview' && (
                            <div className="mx-6 mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
                                <div className="flex-1">
                                    <p className="font-bold text-yellow-900 mb-1">⚠️ Branch Mismatch Detected!</p>
                                    <p className="text-sm text-yellow-800">
                                        You selected <strong>{selectedBranch}</strong>, but the filename suggests this is for <strong>{detectedBranch}</strong>.
                                    </p>
                                    <p className="text-sm text-yellow-800 mt-2">
                                        The system will automatically import to <strong>{detectedBranch}</strong> to prevent errors.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-auto p-6">
                            {importStep === 'upload' && (
                                <div>
                                    <label className="border-4 border-dashed border-gray-300 rounded-xl p-12 text-center block hover:border-[#E5562E] hover:bg-[#F3EBD8]/20 transition-all cursor-pointer">
                                        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                                        <p className="text-gray-600 font-bold mb-2">
                                            {selectedFile ? selectedFile.name : 'Click to select Utak CSV file'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            or drag and drop your CSV here
                                        </p>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                    </label>

                                    <div className="mt-6 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                                        <div className="text-sm text-blue-900">
                                            <p className="font-bold mb-1">How to export from Utak:</p>
                                            <ol className="list-decimal list-inside space-y-1">
                                                <li>Go to Utak inventory page for {selectedBranch}</li>
                                                <li>Export inventory data as CSV</li>
                                                <li>Upload the CSV file here</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {importStep === 'preview' && (
                                <div className="space-y-6">
                                    {/* Summary */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-green-50 p-4 rounded-xl">
                                            <div className="text-green-600 font-bold text-sm">AUTO-MATCHED</div>
                                            <div className="text-3xl font-black text-green-700">
                                                {matchedProducts.length}
                                            </div>
                                        </div>
                                        <div className="bg-yellow-50 p-4 rounded-xl">
                                            <div className="text-yellow-600 font-bold text-sm">NEEDS REVIEW</div>
                                            <div className="text-3xl font-black text-yellow-700">
                                                {unmatchedProducts.length}
                                            </div>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded-xl">
                                            <div className="text-blue-600 font-bold text-sm">TOTAL PRODUCTS</div>
                                            <div className="text-3xl font-black text-blue-700">
                                                {matchedProducts.length + unmatchedProducts.length}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Matched Products Preview */}
                                    {matchedProducts.length > 0 && (
                                        <div>
                                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                                <CheckCircle className="text-green-600" size={20} />
                                                Auto-Matched Products ({matchedProducts.length})
                                            </h3>
                                            <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-gray-600">
                                                            <th className="pb-2">Utak Product</th>
                                                            <th className="pb-2">→ SKU</th>
                                                            <th className="pb-2 text-right">Stock</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {matchedProducts.slice(0, 10).map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td className="py-1">{item.utakTitle}</td>
                                                                <td className="py-1 font-mono font-bold text-[#510813]">
                                                                    {item.sku}
                                                                </td>
                                                                <td className="py-1 text-right">{item.endStock}</td>
                                                            </tr>
                                                        ))}
                                                        {matchedProducts.length > 10 && (
                                                            <tr>
                                                                <td colSpan="3" className="py-2 text-center text-gray-500">
                                                                    + {matchedProducts.length - 10} more...
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Unmatched Products */}
                                    {unmatchedProducts.length > 0 && (
                                        <div>
                                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                                <AlertTriangle className="text-yellow-600" size={20} />
                                                Needs Manual Mapping ({unmatchedProducts.length})
                                            </h3>
                                            <div className="bg-yellow-50 rounded-xl p-4 max-h-64 overflow-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-gray-600">
                                                            <th className="pb-2">Utak Product</th>
                                                            <th className="pb-2">Select SKU</th>
                                                            <th className="pb-2 text-right">Stock</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-yellow-200">
                                                        {unmatchedProducts.map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td className="py-2">{item.utakTitle}</td>
                                                                <td className="py-2">
                                                                    <select
                                                                        value={manualMappings[item.utakTitle] || ''}
                                                                        onChange={(e) => handleManualMapping(item.utakTitle, e.target.value)}
                                                                        className="text-xs px-2 py-1 rounded border border-gray-300 focus:border-[#E5562E] focus:ring-2 focus:ring-[#E5562E]/20 outline-none font-mono"
                                                                    >
                                                                        <option value="">Skip this item</option>
                                                                        ```
                                                                        {availableSKUs.map(sku => (
                                                                            <option key={sku.sku} value={sku.sku}>
                                                                                {sku.sku} - {sku.description}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="py-2 text-right">{item.endStock}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {importStep === 'processing' && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#E5562E] mb-4"></div>
                                    <p className="text-xl font-bold text-[#510813]">Importing data...</p>
                                    <p className="text-sm text-gray-600 mt-2">Please wait while we update the inventory</p>
                                </div>
                            )}

                            {importStep === 'complete' && importProgress && (
                                <div className="text-center py-8">
                                    <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
                                    <h3 className="text-2xl font-black text-[#510813] mb-4">Import Successful!</h3>
                                    <div className="bg-green-50 rounded-xl p-6 inline-block">
                                        <div className="text-left space-y-2">
                                            <p><span className="font-bold">Imported:</span> {importProgress.imported} products</p>
                                            <p><span className="font-bold">Matched:</span> {importProgress.matched} products</p>
                                            <p><span className="font-bold">Skipped:</span> {importProgress.unmatched} products</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-200 flex justify-between">
                            <button
                                onClick={closeImportModal}
                                className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-all"
                            >
                                {importStep === 'complete' ? 'Close' : 'Cancel'}
                            </button>

                            {importStep === 'preview' && (
                                <button
                                    onClick={handleConfirmImport}
                                    disabled={matchedProducts.length === 0}
                                    className="px-8 py-3 rounded-xl bg-[#E5562E] hover:bg-[#c94925] text-white font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <FileText size={20} />
                                    <span>Confirm Import ({matchedProducts.length + Object.keys(manualMappings).length} products)</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Capacity Settings Modal */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <BranchCapacitySettings
                        isOpen={isSettingsModalOpen}
                        onClose={() => setIsSettingsModalOpen(false)}
                    />
                </div>
            )}

            <BranchPriceSettings
                isOpen={isPriceSettingsModalOpen}
                onClose={() => setIsPriceSettingsModalOpen(false)}
                branchLocation={selectedBranch}
            />

            {showToast && <Toast message="Capacity settings saved!" onClose={() => setShowToast(false)} />}
        </div>
    );
};

export default BranchInventory;
