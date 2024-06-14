import { orders as Order } from "../../../../models";
import { orderitems as OrderItem } from "../../../../models";
import jwt from "jsonwebtoken";

export default async (req, res) => {
	switch (req.method) {
		case "GET":
			await getOrders(req, res);
			break;

		default:
			res.status(405).send(`Method ${req.method} not allowed`);
			break;
	}
};

const getOrders = async (req, res) => {
	try {
		const { userId } = jwt.verify(
			req.headers.authorization,
			process.env.JWT_SECRET
		);

		const orders = await Order.findAll({
			where: {
				userId: userId,
			},
			order: [["createdAt", "DESC"]],

			include: [
				{
					model: OrderItem,
					as: "ordersItem",
				},
			],
		});

		return res.status(200).send(orders);
	} catch (error) {
		res.status(500).send("Error");
	}
};
