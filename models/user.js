"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class User extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	User.init(
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true,
			},

			name: {
				type: DataTypes.STRING,
			},

			email: {
				type: DataTypes.STRING,
			},
			password: {
				type: DataTypes.STRING,
			},

			role: {
				type: DataTypes.STRING,
				defaultValue: "user",
			},
		},
		{
			sequelize,
			modelName: "User",
		}
	);
	return User;
};
