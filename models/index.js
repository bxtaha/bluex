"use strict";

const Sequelize = require("sequelize");
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];
const db = {};

import User from "./user";
import Store from "./store";
import Product from "./product";
import Order from "./order";
import OrderItem from "./orderitem";

let sequelize;
if (config.use_env_variable) {
	sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
	sequelize = new Sequelize(
		config.database,
		config.username,
		config.password,
		config
	);
}

db.users = User(sequelize, Sequelize);
db.stores = Store(sequelize, Sequelize);
db.products = Product(sequelize, Sequelize);
db.orders = Order(sequelize, Sequelize);
db.orderitems = OrderItem(sequelize, Sequelize);

db.users.hasOne(db.stores, { as: "stores", foreignKey: "userId" });
db.stores.belongsTo(db.users, { as: "users", foreignKey: "userId" });

db.stores.hasMany(db.products, { as: "products", foreignKey: "storeId" });
db.products.belongsTo(db.stores, { as: "stores", foreignKey: "storeId" });

db.users.hasMany(db.products, { as: "products", foreignKey: "userId" });
db.products.belongsTo(db.users, { as: "users", foreignKey: "userId" });

db.orders.belongsTo(db.users, { as: "users", foreignKey: "userId" });
db.users.hasMany(db.orders, {
	onDelete: "cascade",
	as: "users",
	foreignKey: "userId",
});

db.orders.hasMany(db.orderitems, { as: "ordersItem", foreignKey: "orderId" });
db.orderitems.belongsTo(db.orders, { as: "orders", foreignKey: "orderId" });

db.products.hasMany(db.orderitems, { as: "products", foreignKey: "productId" });
db.orderitems.belongsTo(db.products, {
	as: "products",
	foreignKey: "productId",
});

db.sequelize = sequelize;

module.exports = db;
