"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class OrderItem extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	OrderItem.init(
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true,
			},

			name: { type: DataTypes.STRING, allowNull: false },

			quantity: { type: DataTypes.STRING, allowNull: false },

			image: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false },

			price: { type: DataTypes.STRING, allowNull: false },

			storeId: {
				type: DataTypes.UUID,
				allowNull: true,
			},

			userId: {
				type: DataTypes.UUID,
				allowNull: true,
			},

			productId: {
				type: DataTypes.UUID,
				allowNull: true,
			},

			orderId: {
				type: DataTypes.UUID,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "OrderItem",
		}
	);
	return OrderItem;
};
