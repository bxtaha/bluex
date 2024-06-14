"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Product extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	Product.init(
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
				allowNull: true,
			},

			productImage: {
				type: DataTypes.ARRAY(DataTypes.TEXT),
			},
			hoverImage: {
				type: DataTypes.STRING,
			},
			name: {
				type: DataTypes.STRING,
			},
			description: {
				type: DataTypes.TEXT,
			},
			price: {
				type: DataTypes.INTEGER,
			},
			oldPrice: {
				type: DataTypes.INTEGER,
			},
			newProduct: {
				type: DataTypes.STRING,
			},
			availability: {
				type: DataTypes.STRING,
			},
			offer: {
				type: DataTypes.STRING,
			},
			onSale: {
				type: DataTypes.STRING,
			},
			discount: {
				type: DataTypes.STRING,
			},
			discountPercent: {
				type: DataTypes.STRING,
			},
			productType: {
				type: DataTypes.STRING,
			},
		},
		{
			sequelize,
			modelName: "Product",
		}
	);
	return Product;
};
