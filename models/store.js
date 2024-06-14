"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Store extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	Store.init(
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true,
			},

			userId: {
				type: DataTypes.UUID,
				allowNull: false,
			},

			name: {
				type: DataTypes.STRING,
			},

			web: {
				type: DataTypes.STRING,
			},

			email: {
				type: DataTypes.STRING,
			},

			aboutText: {
				type: DataTypes.TEXT,
			},

			status: {
				type: DataTypes.ENUM,
				defaultValue: "pending",
				values: ["pending", "approved", "decline"],
			},
		},
		{
			sequelize,
			modelName: "Store",
		}
	);
	return Store;
};
