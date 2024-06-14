import jwt from "jsonwebtoken";
import { products as Product } from "../../../../models";

export default async (req, res) => {
	switch (req.method) {
		case "GET":
			await getSingleProduct(req, res);
			break;
		case "DELETE":
			await deleteProduct(req, res);
			break;

		default:
			res.status(405).send(`Method ${req.method} not allowed`);
			break;
	}
};

const getSingleProduct = async (req, res) => {
	try {
		const product = await Product.findByPk(req.query.id);
		return res.status(200).json(product);
	} catch (error) {
		res.status(500).send("Error in deleting product, please try again!");
	}
};

const deleteProduct = async (req, res) => {
	const { userId } = jwt.verify(
		req.headers.authorization,
		process.env.JWT_SECRET
	);

	try {
		await Product.destroy({
			where: {
				id: req.query.id,
			},
		});
		const products = await Product.findAll({
			where: {
				userId: userId,
			},
			order: [["createdAt", "DESC"]],
		});
		return res.status(200).send(products);
	} catch (error) {
		res.status(500).send("Error in deleting product, please try again!");
	}
};
