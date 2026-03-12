import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Lock, Unlock, Plus, Minus } from 'lucide-react';

const InventoryTable = ({ locationName }) => {
    const { inventory, addStock } = useInventory();
    const [isEditing, setIsEditing] = useState(false);

    const toggleEditMode = () => {
        if (!isEditing) {
            const password = prompt("Enter Admin Password to Enable Editing:");
            if (password === "1234") {
                setIsEditing(true);
            } else if (password !== null) {
                alert("Incorrect Password");
            }
        } else {
            setIsEditing(false);
        }
    };

    const handleAdjustment = (sku, amount) => {
        addStock(sku, amount);
    };

    // Sort inventory: FGC -> FGP -> FGL -> FGG -> FGT
    const sortedInventory = [...inventory].sort((a, b) => {
        const priority = { 'FGC': 1, 'FGP': 2, 'FGL': 3, 'FGG': 4, 'FGT': 5 };
        const getPrefix = (sku) => sku.split('-')[0];

        const pA = priority[getPrefix(a.sku)] || 99;
        const pB = priority[getPrefix(b.sku)] || 99;

        if (pA !== pB) return pA - pB;
        return a.sku.localeCompare(b.sku);
    });

    return (
        <div className="inventory-table-container">
            <div className="location-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="location-label">LOCATION:</span>
                    <span className="location-badge">{locationName}</span>
                </div>
                <button
                    onClick={toggleEditMode}
                    className="icon-btn"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: isEditing ? 'var(--danger)' : 'var(--text-secondary)' }}
                    title={isEditing ? "Disable Edit Mode" : "Enable Edit Mode (Admin Only)"}
                >
                    {isEditing ? <Unlock size={20} /> : <Lock size={20} />}
                </button>
            </div>

            <div className="viewing-text">Viewing: {locationName}</div>

            <table className="inventory-table">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>PRODUCT DESCRIPTION</th>
                        <th>UOM</th>
                        <th>QUANTITY</th>
                        <th>LOCATION</th>
                        {isEditing && <th>EDIT</th>}
                    </tr>
                </thead>
                <tbody>
                    {sortedInventory.map((item) => (
                        <tr key={item.sku}>
                            <td>{item.sku}</td>
                            <td>{item.description}</td>
                            <td>{item.uom}</td>
                            <td>{item.quantity}</td>
                            <td>{locationName}</td>
                            {isEditing && (
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => handleAdjustment(item.sku, 1)}
                                            className="adjust-btn plus"
                                            title="Add 1"
                                        >
                                            <Plus size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleAdjustment(item.sku, -1)}
                                            className="adjust-btn minus"
                                            title="Remove 1"
                                            disabled={item.quantity <= 0}
                                        >
                                            <Minus size={14} />
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default InventoryTable;
