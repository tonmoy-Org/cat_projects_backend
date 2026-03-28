const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Cat = require('../models/Cat');

// 🔹 Get Model dynamically
const getModel = (type) => {
  return type === 'Product' ? Product : Cat;
};

// 🔹 Find item by ID (auto-detect model type)
const findItemByIdAndType = async (itemId) => {
  let item = null;
  let itemType = null;

  // Try to find in Product model
  item = await Product.findById(itemId);
  if (item) {
    itemType = 'Product';
    return { item, itemType };
  }

  // Try to find in Cat model
  item = await Cat.findById(itemId);
  if (item) {
    itemType = 'Cat';
    return { item, itemType };
  }

  return { item: null, itemType: null };
};

// 🔹 Get or Create Cart
const getOrCreateCart = async (userId) => {
  if (!userId) throw new Error('User ID missing');

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: []
    });
  }

  return cart;
};

// 🔹 Populate items
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
      console.error(err);
    }
  }

  return result;
};

// 🔹 Calculate total
const calcTotal = (items) => {
  return items.reduce((sum, i) => {
    return sum + (i.itemData?.price || 0) * i.quantity;
  }, 0);
};


// =============================
// ✅ GET CART
// =============================
exports.getCart = async (req, res) => {
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
    res.status(500).json({ success: false, message: err.message });
  }
};


// =============================
// ✅ ADD TO CART (AUTO-DETECT TYPE)
// =============================
exports.addToCart = async (req, res) => {
  try {
    const { itemId, quantity = 1 } = req.body;

    // Auto-detect item type by searching both models
    const { item, itemType } = await findItemByIdAndType(itemId);

    if (!item || !itemType) {
      return res.status(404).json({ success: false, message: 'Item not found in Product or Cat' });
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
      message: 'Added to cart',
      cart: {
        ...cart.toObject(),
        items,
        total: calcTotal(items)
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// =============================
// ✅ UPDATE ITEM (AUTO-DETECT TYPE)
// =============================
exports.updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    // Auto-detect item type
    const { item, itemType } = await findItemByIdAndType(itemId);

    if (!item || !itemType) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const cart = await getOrCreateCart(req.user.id);

    const cartItem = cart.items.find(
      i => i.itemId.toString() === itemId && i.itemType === itemType
    );

    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Item not in cart' });
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
    res.status(500).json({ success: false, message: err.message });
  }
};


// =============================
// ✅ REMOVE ITEM (AUTO-DETECT TYPE)
// =============================
exports.removeItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    // Auto-detect item type
    const { item, itemType } = await findItemByIdAndType(itemId);

    if (!item || !itemType) {
      return res.status(404).json({ success: false, message: 'Item not found' });
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
    res.status(500).json({ success: false, message: err.message });
  }
};


// =============================
// ✅ CLEAR CART
// =============================
exports.clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);

    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      message: 'Cart cleared'
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};