import isLength from "validator/lib/isLength";
import { products as Product } from "../../../../models";
const { Op } = require("sequelize");

export default async (req, res) => {
	switch (req.method) {
		case "POST":
			await createProduct(req, res);
			break;
		case "PUT":
			await updateProduct(req, res);
			break;

		case "GET":
			await getProducts(req, res);
			break;

		default:
			res.status(405).send(`Method ${req.method} not allowed`);
			break;
	}
};

const createProduct = async (req, res) => {
	// console.log(req.body);
	const {
		userId,
		storeId,
		productImage,
		hoverImage,
		name,
		description,
		price,
		oldPrice,
		newProduct,
		availability,
		offer,
		onSale,
		discount,
		discountPercent,
		productType,
	} = req.body;

	try {
		if (!isLength(name, { min: 3 })) {
			return res
				.status(422)
				.send("The name should be a minimum of Three characters long");
		} else if (!description) {
			return res.status(422).send("description required");
		} else if (!price) {
			return res.status(422).send("price required");
		} else if (!productType) {
			return res.status(422).send("productType required");
		}

		await Product.create({
			userId,
			storeId,
			productImage,
			hoverImage,
			name,
			description,
			price,
			oldPrice,
			newProduct,
			availability,
			offer,
			onSale,
			discount,
			discountPercent,
			productType,
		});

		res.send("Product created successfully!");
	} catch (err) {
		console.log(err);
		res.status(500).send("Error in creating Product, please try again!");
	}
};

const updateProduct = async (req, res) => {
	const {
		id,
		userId,
		storeId,
		productImage,
		hoverImage,
		name,
		description,
		price,
		oldPrice,
		newProduct,
		availability,
		offer,
		onSale,
		discount,
		discountPercent,
		productType,
	} = req.body;

	try {
		let product = await Product.findByPk(id);

		await product.update({
			userId,
			storeId,
			productImage,
			hoverImage,
			name,
			description,
			price,
			oldPrice,
			newProduct,
			availability,
			offer,
			onSale,
			discount,
			discountPercent,
			productType,
		});

		const products = await Product.findAll({
			where: {
				userId: userId,
			},
			order: [["createdAt", "DESC"]],
		});

		res.status(200).json({ products });
	} catch (error) {
		res.status(403).json({ message: "Invalid token" });
	}
};

const getProducts = async (req, res) => {
	const { page, limit, keyword } = req.query;

	try {
		//search
		const searchKeyword = keyword ? keyword : "";

		//pagination
		const pageNumber = parseInt(page);
		const getRealNumber = isNaN(pageNumber) ? 0 : pageNumber;
		const postsOffset = limit * (getRealNumber - 1);

		const totalProducts = await Product.count({});

		const products = await Product.findAll({
			where: {
				name: { [Op.iLike]: "%" + searchKeyword + "%" },
			},
			order: [["createdAt", "ASC"]],
			offset: postsOffset,
			limit,
		});

		const totalPages = Math.ceil(totalProducts / limit);

		return res.status(200).json({ products, totalPages });
	} catch (error) {
		res.status(500).send("Error in finding Products, please try again!");
	}
};
