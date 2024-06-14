import TopNavbar from "../../components/Admin/TopNavbar";
import LeftSidebar from "../../components/Admin/LeftSidebar";
import OrdersTable from "../../components/Admin/orders/OrdersTable";

import axios from "axios";
import { parseCookies } from "nookies";
import baseUrl from "../../utils/baseUrl";

const Orders = ({ orders, store, totalPages, user }) => {
	return (
		<>
			<TopNavbar user={user} />
			<LeftSidebar user={user} store={store} />

			<div className="admin-main-content d-flex flex-column">
				{orders.length > 0 ? (
					<OrdersTable orders={orders} totalPages={totalPages} />
				) : (
					<p className="empty-store">No Orders Available!</p>
				)}
			</div>
		</>
	);
};

export async function getServerSideProps(ctx) {
	const { livani_token } = parseCookies(ctx);
	const page = ctx.query.page ? ctx.query.page : "1";

	const payload = {
		params: {
			page,
			limit: 10,
		},
		headers: { Authorization: livani_token },
	};

	const url = `${baseUrl}/api/v1/orders`;

	const response = await axios.get(url, payload);

	const { orders, totalPages } = response.data;
	return {
		props: {
			orders,
			totalPages,
		},
	};
}

export default Orders;
