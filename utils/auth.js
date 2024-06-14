import cookie from "js-cookie";
import Router from "next/router";

export const handleLogin = (token) => {
	cookie.set("livani_token", token);
	Router.push("/profile");
};

export const redirectUser = (ctx, location) => {
	if (ctx.req) {
		ctx.res.writeHead(302, { Location: location });
		ctx.res.end();
	} else {
		Router.push(location);
	}
};

export const handleLogout = () => {
	cookie.remove("livani_token");
	localStorage.removeItem("cartItems");
	document.location.href = "/";
};
