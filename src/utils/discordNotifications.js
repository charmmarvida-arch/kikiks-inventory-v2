// Discord Webhook Utility
// Sends order notifications to Discord

const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL;

/**
 * Sends a new order notification to Discord
 * @param {Object} orderData - The order data object
 * @returns {Promise\u003cvoid\u003e}
 */
export const sendOrderNotification = async (orderData, inventory = []) => {
    if (!DISCORD_WEBHOOK_URL) {
        console.warn('Discord webhook URL not configured. Skipping notification.');
        return;
    }

    try {
        const { resellerName, location, address, items, totalAmount, date } = orderData;

        // Format items list
        const itemsList = Object.entries(items)
            .map(([sku, qty]) => {
                const item = inventory.find(i => i.sku === sku);
                const description = item ? item.description : sku;
                return `   • ${description} x ${qty}`;
            })
            .join('\n');

        // Format date
        const orderDate = new Date(date);
        const formattedDate = orderDate.toLocaleString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        // Create Discord embed message
        const embed = {
            title: '🛒 NEW ORDER RECEIVED!',
            color: 0x00ff00, // Green color
            fields: [
                {
                    name: '👤 Reseller',
                    value: resellerName || 'Unknown',
                    inline: true
                },
                {
                    name: '📍 Location',
                    value: location || 'Not specified',
                    inline: true
                },
                {
                    name: '🏠 Address',
                    value: address || 'Not specified',
                    inline: false
                },
                {
                    name: '📦 Items',
                    value: itemsList || 'No items',
                    inline: false
                },
                {
                    name: '💰 Total Amount',
                    value: `₱${totalAmount?.toLocaleString() || '0'}`,
                    inline: true
                },
                {
                    name: '🕐 Time',
                    value: formattedDate,
                    inline: true
                }
            ],
            footer: {
                text: 'Kikiks Inventory System'
            },
            timestamp: orderDate.toISOString()
        };

        // Send to Discord
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed]
            })
        });

        if (!response.ok) {
            console.error('Failed to send Discord notification:', await response.text());
        } else {
            console.log('Discord notification sent successfully!');
        }

    } catch (error) {
        console.error('Error sending Discord notification:', error);
        // Don't throw error - notification failure shouldn't break order submission
    }
};
