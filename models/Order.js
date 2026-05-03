const OrderModel = require('./mongoose/Order');

// Status flow for automatic updates
const STATUS_FLOW = ['processing', 'preparing', 'enroute', 'delivered'];

// Validation: Check required fields for order
function validateOrder(orderData) {
    const errors = [];

    if (!orderData.userId) {
        errors.push('User ID is required');
    }

    if (!orderData.customer || !orderData.customer.name || orderData.customer.name.trim() === '') {
        errors.push('Customer name is required');
    }

    if (!orderData.customer || !orderData.customer.phone || orderData.customer.phone.trim() === '') {
        errors.push('Customer phone is required');
    }

    if (!orderData.customer || !orderData.customer.address || orderData.customer.address.trim() === '') {
        errors.push('Delivery address is required');
    }

    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        errors.push('Order must contain at least one item');
    }

    if (!orderData.paymentMethod) {
        errors.push('Payment method is required');
    }

    return errors;
}

// Helper: format order for response
function formatOrder(order) {
    const obj = order.toObject ? order.toObject() : order;
    return {
        id: obj._id,
        userId: obj.userId,
        customer: obj.customer,
        items: obj.items.map(item => ({
            mealId: item.mealId,
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
            sellerId: item.sellerId
        })),
        total: parseFloat(obj.total),
        paymentMethod: obj.paymentMethod,
        status: obj.status,
        createdAt: obj.createdAt,
        estimatedDelivery: obj.estimatedDelivery
    };
}

// Variable to hold interval reference
let statusSimulationInterval = null;

const Order = {
    ensureDataExists() {},

    // Get all orders
    async findAll() {
        const orders = await OrderModel.find({}).sort({ createdAt: -1 });
        return orders.map(formatOrder);
    },

    // Find order by ID
    async findById(id) {
        const order = await OrderModel.findById(id);
        if (!order) return undefined;
        return formatOrder(order);
    },

    // Find orders by user ID
    async findByUserId(userId) {
        const orders = await OrderModel.find({ userId }).sort({ createdAt: -1 });
        return orders.map(formatOrder);
    },

    // Find orders by seller ID (orders containing this seller's meals)
    async findBySellerId(sellerId) {
        const orders = await OrderModel.find({
            'items.sellerId': sellerId
        }).sort({ createdAt: -1 });

        if (orders.length === 0) return [];

        return orders.map(order => {
            const orderData = formatOrder(order);
            const sellerOnlyItems = orderData.items.filter(
                item => item.sellerId && item.sellerId.toString() === sellerId.toString()
            );
            const sellerTotal = sellerOnlyItems.reduce(
                (sum, item) => sum + (item.price * item.quantity),
                0
            );
            return {
                ...orderData,
                items: sellerOnlyItems,
                sellerTotal
            };
        });
    },

    // Create new order
    async create(orderData) {
        const errors = validateOrder(orderData);
        if (errors.length > 0) {
            return { success: false, errors };
        }

        try {
            const total = orderData.items.reduce((sum, item) => {
                return sum + (parseFloat(item.price) * parseInt(item.quantity));
            }, 0);

            const order = await OrderModel.create({
                userId: orderData.userId,
                customer: {
                    name: orderData.customer.name.trim(),
                    phone: orderData.customer.phone.trim(),
                    address: orderData.customer.address.trim(),
                    notes: orderData.customer.notes ? orderData.customer.notes.trim() : ''
                },
                items: orderData.items.map(item => ({
                    mealId: item.mealId,
                    name: item.name,
                    price: parseFloat(item.price),
                    quantity: parseInt(item.quantity),
                    sellerId: item.sellerId || null
                })),
                total: total,
                paymentMethod: orderData.paymentMethod,
                status: 'processing',
                estimatedDelivery: new Date(Date.now() + 40 * 60000)
            });

            return {
                success: true,
                order: formatOrder(order)
            };
        } catch (error) {
            if (error.name === 'ValidationError') {
                const firstError = Object.values(error.errors)[0];
                return { success: false, errors: [firstError.message] };
            }
            throw error;
        }
    },

    // Update order status
    async updateStatus(id, status) {
        const order = await OrderModel.findById(id);

        if (!order) {
            return { success: false, errors: ['Order not found'] };
        }

        const validStatuses = ['processing', 'preparing', 'enroute', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return { success: false, errors: ['Invalid status'] };
        }

        order.status = status;
        await order.save();

        return {
            success: true,
            order: formatOrder(order)
        };
    },

    // Simulate automatic status updates
    async simulateStatusUpdates() {
        try {
            const orders = await OrderModel.find({
                status: { $in: ['processing', 'preparing', 'enroute'] }
            });

            for (const order of orders) {
                const currentIndex = STATUS_FLOW.indexOf(order.status);
                if (currentIndex !== -1 && currentIndex < STATUS_FLOW.length - 1) {
                    order.status = STATUS_FLOW[currentIndex + 1];
                    await order.save();
                }
            }
        } catch (error) {
            console.error('Status simulation error:', error);
        }
    },

    // Start automatic status simulation
    startStatusSimulation(intervalMs = 60000) {
        if (statusSimulationInterval) {
            clearInterval(statusSimulationInterval);
        }
        statusSimulationInterval = setInterval(async () => {
            await Order.simulateStatusUpdates();
        }, intervalMs);
    },

    // Stop status simulation
    stopStatusSimulation() {
        if (statusSimulationInterval) {
            clearInterval(statusSimulationInterval);
            statusSimulationInterval = null;
        }
    }
};

module.exports = Order;
