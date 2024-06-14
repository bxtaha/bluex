import { useState, useEffect } from "react";
import { Provider } from "react-redux";
import { useStore } from "../store";
import { ToastProvider } from "react-toast-notifications";
import { parseCookies, destroyCookie } from "nookies";
import { redirectUser } from "../utils/auth";
import baseUrl from "../utils/baseUrl";
import axios from "axios";

import "../public/scss/bootstrap.min.css";
import "../public/scss/animate.min.css";
import "../public/scss/boxicons.min.css";
import "../public/scss/flaticon.css";
import "../node_modules/slick-carousel/slick/slick.css";
import "../node_modules/slick-carousel/slick/slick-theme.css";
import "../public/scss/styles.css";
import "../public/scss/nprogress.css";
import "../public/scss/responsive.css";
import "../public/scss/dashboard.css";

import GoTop from "../components/Shared/GoTop";
import Loader from "../components/Shared/Loader";

import Router from "next/router";
import NProgress from "nprogress";
import Head from "next/head";

Router.onRouteChangeStart = () => NProgress.start();
Router.onRouteChangeComplete = () => NProgress.done();
Router.onRouteChangeError = () => NProgress.done();

export default function App({ Component, pageProps }) {
	const store = useStore(pageProps.initialReduxState);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setTimeout(() => setLoading(false), 2000);
	}, []);

	return (
		<>
			<Head>
				<title>Livani - React Next eCommerce Template</title>
				<meta
					name="viewport"
					content="initial-scale=1.0, width=device-width"
				/>
			</Head>

			<ToastProvider
				placement="bottom-center"
				autoDismissTimeout={6000}
				autoDismiss
			>
				<Provider store={store}>
					<Component {...pageProps} />
					<Loader loading={loading} />
					<GoTop scrollStepInPx="100" delayInMs="10.50" />
				</Provider>
			</ToastProvider>
		</>
	);
}

App.getInitialProps = async ({ Component, ctx }) => {
	const { livani_token } = parseCookies(ctx);
	// console.log(livani_token);
	let pageProps = {};

	if (Component.getInitialProps) {
		pageProps = await Component.getInitialProps(ctx);
	}

	if (!livani_token) {
		// if a user not logged in then user can't access those pages
		const isProtectedRoute =
			ctx.pathname === "/sale-request" ||
			ctx.pathname === "/admin/dashboard" ||
			ctx.pathname === "/admin/products" ||
			ctx.pathname === "/admin/orders" ||
			ctx.pathname === "/admin/customers" ||
			ctx.pathname === "/admin/users" ||
			ctx.pathname === "/admin/store-requests" ||
			ctx.pathname === "/stores/dashboard" ||
			ctx.pathname === "/stores/products" ||
			ctx.pathname === "/profile";

		if (isProtectedRoute) {
			redirectUser(ctx, "/");
		}
	} else {
		// if a user logged in then user can't access those pages
		const ifLoggedIn =
			ctx.pathname === "/signup" || ctx.pathname === "/login";
		if (ifLoggedIn) {
			redirectUser(ctx, "/");
		}

		try {
			const payload = { headers: { Authorization: livani_token } };

			//user
			const url = `${baseUrl}/api/v1/auth/account`;
			const response = await axios.get(url, payload);
			const { user, store } = response.data;
			const isSuperAdmin = user.role === "super-admin";
			const isAdmin = user.role === "admin";

			const isNotSuperAdmin =
				!(isAdmin || isSuperAdmin) &&
				(ctx.pathname === "/admin/dashboard" ||
					ctx.pathname === "/admin/products" ||
					ctx.pathname === "/admin/orders" ||
					ctx.pathname === "/admin/customers" ||
					ctx.pathname === "/admin/users" ||
					ctx.pathname === "/admin/store-requests");

			if (isNotSuperAdmin) {
				redirectUser(ctx, "/");
			}

			pageProps.user = user;
			pageProps.store = store;
		} catch (error) {
			console.log("error", error);
		}
	}

	return {
		pageProps,
	};
};
