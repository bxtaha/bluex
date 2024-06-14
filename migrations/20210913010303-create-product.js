'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Products', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },

      storeId: {
        type: Sequelize.UUID,
        onDelete: 'CASCADE',
        references: {
          model: 'Stores',
          key: 'id',
          as: 'storeId',
        },
      },
      userId: {
        type: Sequelize.UUID,
        onDelete: 'CASCADE',
        references: {
          model: 'Users',
          key: 'id',
          as: 'userId',
        },
      },

      productImage: {
        type: Sequelize.ARRAY(Sequelize.TEXT)
      },
      hoverImage: {
        type: Sequelize.STRING,
      },
      name: {
        type: Sequelize.STRING,
      },
      description: {
        type: Sequelize.TEXT,
      },
      price: {
        type: Sequelize.INTEGER,
      },
      oldPrice: {
        type: Sequelize.INTEGER,
      },
      newProduct: {
        type: Sequelize.STRING,
      },
      availability: {
        type: Sequelize.STRING,
      },
      offer: {
        type: Sequelize.STRING,
      },
      onSale: {
        type: Sequelize.STRING,
      },
      discount: {
        type: Sequelize.STRING,
      },
      discountPercent: {
        type: Sequelize.STRING,
      },
      productType: {
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Products');
  },
};
