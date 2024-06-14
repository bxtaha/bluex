import jwt from "jsonwebtoken";
import { stores as Store } from "../../../../models";
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

	const { userId } = jwt.verify(
		req.headers.authorization,
		process.env.JWT_SECRET
	);

	const user = await User.findOne({
		where: { id: userId },
	});

	//pagination
	const pageNumber = parseInt(page);
	const getRealNumber = isNaN(pageNumber) ? 0 : pageNumber;
	const postsOffset = limit * (getRealNumber - 1);

	try {
		if (user.role === "super-admin") {
			const totalStores = await Store.count({});

			const stores = await Store.findAll({
				order: [["createdAt", "DESC"]],
				offset: postsOffset,
				limit,
			});

			const totalPages = Math.ceil(totalStores / limit);

			return res.status(200).send({ stores, totalPages });
		} else {
			return res.status(200).send("no stores available");
		}
	} catch (error) {
		res.status(500).send("Error in finding stores, please try again!");
	}
};
