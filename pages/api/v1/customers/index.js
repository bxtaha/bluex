import jwt from "jsonwebtoken";
import { users as User } from "../../../../models";

export default async (req, res) => {
	switch (req.method) {
		case "GET":
			await getAllStores(req, res);
			break;

		default:
			res.status(405).send(`Method ${req.method} not allowed`);
			break;
	}
};

const getAllStores = async (req, res) => {
	const { page, limit } = req.query;

	//pagination
	const pageNumber = parseInt(page);
	const getRealNumber = isNaN(pageNumber) ? 0 : pageNumber;
	const postsOffset = limit * (getRealNumber - 1);

	try {
		const totalUsers = await User.count({});

		const customers = await User.findAll({
			order: [["createdAt", "DESC"]],
			offset: postsOffset,
			limit,
		});

		const totalPages = Math.ceil(totalUsers / limit);

		return res.status(200).send({ customers, totalPages });
	} catch (error) {
		res.status(500).send("Error in finding stores, please try again!");
	}
};
