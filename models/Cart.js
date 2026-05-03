const UserModel = require('./mongoose/User');

// Validation: Check required fields for cart item
function validateCartItem(item) {
    const errors = [];
    if (!item.mealId) {
        errors.push('Meal ID is required');
    }
    if (!item.name || item.name.trim() === '') {
        errors.push('Meal name is required');
    }
    if (item.price === undefined || item.price === null) {
        errors.push('Price is required');
    }
    if (isNaN(parseFloat(item.price))) {
        errors.push('Price must be a number');
    }
    if (!item.image) {
        errors.push('Image is required');
    }
    if (!item.quantity || item.quantity < 1) {
        errors.push('Quantity must be at least 1');
    }
    if (!item.userId) {
        errors.push('User ID is required');
    }
    return errors;
}

// Validation: Check quantity for update
function validateQuantity(quantity) {
    if (quantity === undefined || quantity === null) {
        return ['Quantity is required'];
    }
    if (isNaN(parseInt(quantity)) || parseInt(quantity) < 1) {
        return ['Quantity must be at least 1'];
    }
    return [];
}

// Helper: format cart items for response
function formatCart(user) {
    return user.cart.map(item => {
        const obj = item.toObject();
        obj.id = obj._id;
        return obj;
    });
}

const Cart = {
    ensureDataExists() {},

    // Get all cart items (for admin/debug)
    async getAll() {
        const users = await UserModel.find({ 'cart.0': { $exists: true } }, { cart: 1 });
        const allItems = [];
        for (const user of users) {
            for (const item of user.cart) {
                const obj = item.toObject();
                obj.id = obj._id;
                obj.userId = user._id;
                allItems.push(obj);
            }
        }
        return allItems;
    },

    // Get cart items for a specific user
    async getByUserId(userId) {
        const user = await UserModel.findById(userId);
        if (!user) return [];
        return formatCart(user);
    },

    // Find cart item by meal ID for a specific user
    async findByMealIdAndUser(mealId, userId) {
        const user = await UserModel.findById(userId);
        if (!user) return undefined;
        const item = user.cart.find(i => i.mealId.toString() === mealId.toString());
        if (!item) return undefined;
        const obj = item.toObject();
        obj.id = obj._id;
        return obj;
    },

    // Find cart item by cart item ID for a specific user
    async findByIdAndUser(id, userId) {
        const user = await UserModel.findById(userId);
        if (!user) return undefined;
        const item = user.cart.id(id);
        if (!item) return undefined;
        const obj = item.toObject();
        obj.id = obj._id;
        return obj;
    },

    // Add item to user's cart (or increase quantity if exists)
    async addItem(userId, itemData) {
        const itemWithUser = { ...itemData, userId };

        const errors = validateCartItem(itemWithUser);
        if (errors.length > 0) {
            return { success: false, errors };
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return { success: false, errors: ['User not found'] };
        }

        // Check if item already exists in cart
        const existingItem = user.cart.find(
            i => i.mealId.toString() === itemData.mealId.toString()
        );

        if (existingItem) {
            existingItem.quantity += parseInt(itemData.quantity);
            await user.save();
            return {
                success: true,
                cart: formatCart(user),
                message: 'Quantity updated'
            };
        }

        // Add new item
        user.cart.push({
            mealId: itemData.mealId,
            name: itemData.name,
            price: parseFloat(itemData.price),
            image: itemData.image,
            quantity: parseInt(itemData.quantity),
            sellerId: itemData.sellerId || null
        });

        await user.save();
        const newItem = user.cart[user.cart.length - 1];
        const itemObj = newItem.toObject();
        itemObj.id = itemObj._id;

        return {
            success: true,
            cart: formatCart(user),
            item: itemObj,
            message: 'Item added to cart'
        };
    },

    // Remove item from user's cart
    async removeItem(userId, itemId) {
        const user = await UserModel.findById(userId);
        if (!user) {
            return { success: false, errors: ['User not found'] };
        }

        const item = user.cart.id(itemId);
        if (!item) {
            return { success: false, errors: ['Cart item not found'] };
        }

        user.cart.pull({ _id: itemId });
        await user.save();

        return {
            success: true,
            cart: formatCart(user),
            message: 'Item removed from cart'
        };
    },

    // Update item quantity in user's cart
    async updateQuantity(userId, itemId, quantity) {
        const errors = validateQuantity(quantity);
        if (errors.length > 0) {
            return { success: false, errors };
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return { success: false, errors: ['User not found'] };
        }

        const item = user.cart.id(itemId);
        if (!item) {
            return { success: false, errors: ['Cart item not found'] };
        }

        item.quantity = parseInt(quantity);
        await user.save();

        return {
            success: true,
            cart: formatCart(user),
            message: 'Cart item updated'
        };
    },

    // Clear user's entire cart
    async clearByUserId(userId) {
        await UserModel.findByIdAndUpdate(userId, { $set: { cart: [] } });
        return { success: true, cart: [], message: 'Cart cleared' };
    },

    // Clear all carts (admin/testing)
    async clear() {
        await UserModel.updateMany({}, { $set: { cart: [] } });
        return { success: true, cart: [], message: 'All carts cleared' };
    }
};

module.exports = Cart;
