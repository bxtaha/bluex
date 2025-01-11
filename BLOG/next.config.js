const path = require("path");

module.exports = {
	sassOptions: {
		includePaths: [path.join(__dirname, "styles")],
	},
	eslint: { ignoreDuringBuilds: true },
	env: {
		JWT_SECRET: "zxcvbnmasdfghjklpoiuytrewqasdfghmnbvcxzasdfghjloiuytreqsd",
		CLOUDINARY_URL: "https://api.cloudinary.com/v1_1/dev-empty/image/upload",
		CLOUD_NAME: "dev-empty",
		UPLOAD_PRESET: "vikings",
	},
	trailingSlash: true,
};
