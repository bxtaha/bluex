import jwt from "jsonwebtoken";
import { users as User } from "../../../../models";
import { stores as Store } from "../../../../models";
import { products as Product } from "../../../../models";

export default async (req, res) => {
	switch (req.method) {
		case "GET":
			await handleGetRequest(req, res);
			break;

		case "PUT":
			handlePutRequest(req, res);
			break;

		default:
			res.status(405).send(`Method ${req.method} not allowed`);
	}
};

const handleGetRequest = async (req, res) => {
	try {
		const { userId } = jwt.verify(
			req.headers.authorization,
			process.env.JWT_SECRET
		);

		const user = await User.findOne({
			attributes: {
				exclude: ["password"],
			},
			where: { id: userId },
		});

		const store = await Store.findOne({
			where: { userId: userId },
			order: [["createdAt", "DESC"]],
			include: [
				{
					model: Product,
					as: "products",
				},
			],
		});
		if (user) {
			res.status(200).json({ user, store });
		} else {
			res.status(404).send("User not found");
		}
	} catch (error) {
		// console.log(error);
		res.status(403).send("Invalid token");
	}
};

const handlePutRequest = async (req, res) => {
	const { id, role } = req.body;
	// console.log(id, role);

	try {
		await User.update(
			{ role: role },
			{
				where: {
					id: id,
				},
			}
		);
		res.status(203).send("User Updated");
	} catch (error) {
		console.log(error);
		res.status(403).send("User not updated");
	}
};
