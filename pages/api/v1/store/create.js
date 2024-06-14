import jwt from "jsonwebtoken";
import isEmail from "validator/lib/isEmail";
import isLength from "validator/lib/isLength";
import { stores as Store } from "../../../../models";

export default async (req, res) => {
	switch (req.method) {
		case "POST":
			await createStore(req, res);
			break;

		default:
			res.status(405).send(`Method ${req.method} not allowed`);
			break;
	}
};

const createStore = async (req, res) => {
	if (!("authorization" in req.headers)) {
		return res.status(401).send("Not authenticated");
	}

	const { name, web, email, aboutText } = req.body;

	try {
		const { userId } = jwt.verify(
			req.headers.authorization,
			process.env.JWT_SECRET
		);

		// check email, name, aboutText format
		if (!isLength(name, { min: 3, max: 15 })) {
			return res.status(422).send("Name must be 3-15 characters long");
		} else if (!isEmail(email)) {
			return res.status(422).send("Email must be valid");
		} else if (!isLength(aboutText, { min: 15, max: 500 })) {
			return res
				.status(422)
				.send("About texts must be 15-500 characters long");
		}

		const store = await Store.findOne({
			where: { userId: userId, email: email },
		});

		if (store) {
			return res
				.status(422)
				.send(`Store already exist with that user or email`);
		}

		await Store.create({
			userId,
			name,
			web,
			email,
			aboutText,
		});

		res.status(200).send(
			"Successfully created the store & it is now pending, after approval from admin you can create products."
		);
	} catch (error) {
		console.log(error);
		res.status(500).send("Error in creating store, please try again!");
	}
};
