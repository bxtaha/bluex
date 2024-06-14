import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";
import OrdersHistory from "../components/MyOrders/OrdersHistory";

import axios from "axios";
import { parseCookies } from "nookies";
import baseUrl from "../utils/baseUrl";

const MyOrdersHistory = ({ orders, user, store }) => {
	return (
		<>
			<TopHeader user={user} />
			<Navbar user={user} store={store} />
			{orders.length > 0 ? (
				<OrdersHistory orders={orders} />
			) : (
				<p className="empty-store">No Orders Available</p>
			)}
		</>
	);
};

export async function getServerSideProps(ctx) {
	const { livani_token } = parseCookies(ctx);

	const payload = {
		headers: { Authorization: livani_token },
	};

	const url = `${baseUrl}/api/v1/orders/my-orders`;

	const response = await axios.get(url, payload);

	const orders = response.data;
	return {
		props: {
			orders,
		},
	};
}

export default MyOrdersHistory;
