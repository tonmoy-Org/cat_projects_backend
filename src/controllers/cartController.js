const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Cat = require('../models/Cat');

const getModel = (type) => {
    return type === 'Product' ? Product : Cat;
};

const findItemByIdAndType = async (itemId) => {
    let item = await Product.findById(itemId);
    if (item) {
        return { item, itemType: 'Product' };
    }

    item = await Cat.findById(itemId);
    if (item) {
        return { item, itemType: 'Cat' };
    }

    return { item: null, itemType: null };
};

const getOrCreateCart = async (userId) => {
    if (!userId) throw new Error('User ID is required');

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
        cart = await Cart.create({
            user: userId,
            items: []
        });
    }

    return cart;
};

const populateItems = async (items) => {
    const result = [];

    for (const item of items) {
        try {
            const Model = getModel(item.itemType);
            const data = await Model.findById(item.itemId).lean();

            if (!data) continue;

            result.push({
                ...item.toObject(),
                itemData: data
            });
        } catch (err) {
            // Silently skip invalid items
        }
    }

    return result;
};

const calcTotal = (items) => {
    return items.reduce((sum, i) => {
        return sum + (i.itemData?.price || 0) * i.quantity;
    }, 0);
};

const getCart = async (req, res) => {
    try {
        const cart = await getOrCreateCart(req.user.id);

        const items = await populateItems(cart.items);

        res.json({
            success: true,
            cart: {
                ...cart.toObject(),
                items,
                total: calcTotal(items)
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error while fetching cart'
        });
    }
};

const addToCart = async (req, res) => {
    try {
        const { itemId, quantity = 1 } = req.body;

        const { item, itemType } = await findItemByIdAndType(itemId);

        if (!item || !itemType) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        const cart = await getOrCreateCart(req.user.id);

        const index = cart.items.findIndex(
            i => i.itemId.toString() === itemId && i.itemType === itemType
        );

        if (index > -1) {
            cart.items[index].quantity += quantity;
        } else {
            cart.items.push({ itemType, itemId, quantity });
        }

        await cart.save();

        const items = await populateItems(cart.items);

        res.json({
            success: true,
            message: 'Item added to cart successfully',
            cart: {
                ...cart.toObject(),
                items,
                total: calcTotal(items)
            }
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error while adding item to cart'
        });
    }
};

const updateItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        const { item, itemType } = await findItemByIdAndType(itemId);

        if (!item || !itemType) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        const cart = await getOrCreateCart(req.user.id);

        const cartItem = cart.items.find(
            i => i.itemId.toString() === itemId && i.itemType === itemType
        );

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        cartItem.quantity = quantity;

        await cart.save();

        const items = await populateItems(cart.items);

        res.json({
            success: true,
            cart: {
                ...cart.toObject(),
                items,
                total: calcTotal(items)
            }
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error while updating cart item'
        });
    }
};

const removeItem = async (req, res) => {
    try {
        const { itemId } = req.params;

        const { item, itemType } = await findItemByIdAndType(itemId);

        if (!item || !itemType) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        const cart = await getOrCreateCart(req.user.id);

        cart.items = cart.items.filter(
            i => !(i.itemId.toString() === itemId && i.itemType === itemType)
        );

        await cart.save();

        const items = await populateItems(cart.items);

        res.json({
            success: true,
            cart: {
                ...cart.toObject(),
                items,
                total: calcTotal(items)
            }
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error while removing item from cart'
        });
    }
};

const clearCart = async (req, res) => {
    try {
        const cart = await getOrCreateCart(req.user.id);

        cart.items = [];
        await cart.save();

        res.json({
            success: true,
            message: 'Cart cleared successfully'
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error while clearing cart'
        });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateItem,
    removeItem,
    clearCart
};