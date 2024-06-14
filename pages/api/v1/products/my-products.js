import jwt from "jsonwebtoken";
import { products as Product } from "../../../../models";

export default async (req, res) => {
	switch (req.method) {
		case "GET":
			await getProducts(req, res);
			break;

		default:
			res.status(405).send(`Method ${req.method} not allowed`);
			break;
	}
};

const getProducts = async (req, res) => {
	const { page, limit } = req.query;

	const { userId } = jwt.verify(
		req.headers.authorization,
		process.env.JWT_SECRET
	);

	try {
		//pagination
		const pageNumber = parseInt(page);
		const getRealNumber = isNaN(pageNumber) ? 0 : pageNumber;
		const postsOffset = limit * (getRealNumber - 1);

		const totalProducts = await Product.count({});

		const products = await Product.findAll({
			where: {
				userId: userId,
			},
			order: [["createdAt", "DESC"]],
			offset: postsOffset,
			limit,
		});

		const totalPages = Math.ceil(totalProducts / limit);

		return res.status(200).json({ products, totalPages });
	} catch (error) {
		res.status(500).send("Error in finding Products, please try again!");
	}
};
