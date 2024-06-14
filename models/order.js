"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Order extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	Order.init(
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true,
			},

			storeId: {
				type: DataTypes.UUID,
				allowNull: true,
			},

			userId: {
				type: DataTypes.UUID,
				allowNull: false,
			},

			name: DataTypes.STRING,

			address: DataTypes.STRING,

			country: DataTypes.STRING,

			city: DataTypes.STRING,

			phone: DataTypes.STRING,

			email: DataTypes.STRING,

			totalPrice: {
				type: DataTypes.STRING,
				allowNull: true,
			},

			isPaid: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},

			isDelivered: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
			},
		},
		{
			sequelize,
			modelName: "Order",
		}
	);
	return Order;
};
