import { users as User } from "../../../../models";
import { Op } from "sequelize";

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
	const userRole = "super-admin";
	const adminRole = "admin";
	try {
		const totalUsers = await User.count({});

		const users = await User.findAll({
			where: {
				role: { [Op.ne]: userRole },
			},
			order: [["createdAt", "DESC"]],
			offset: postsOffset,
			limit,
		});

		const totalPages = Math.ceil(totalUsers / limit);

		return res.status(200).send({ users, totalPages });
	} catch (error) {
		res.status(500).send("Error in finding stores, please try again!");
	}
};
