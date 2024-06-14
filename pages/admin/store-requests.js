import axios from "axios";
import { parseCookies } from "nookies";
import baseUrl from "../../utils/baseUrl";
import LeftSidebar from "../../components/Admin/LeftSidebar";
import RequestTable from "../../components/Admin/requests/RequestTable";

const StoreRequests = ({ stores, store, totalPages, user }) => {
	return (
		<>
			<LeftSidebar user={user} store={store} />
			<div className="admin-main-content d-flex flex-column">
				{stores.length > 0 ? (
					<RequestTable stores={stores} totalPages={totalPages} />
				) : (
					<p className="empty-store">No Store Available!</p>
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

	const url = `${baseUrl}/api/v1/store`;

	const response = await axios.get(url, payload);

	const { stores, totalPages } = response.data;
	return {
		props: {
			stores,
			totalPages,
		},
	};
}

export default StoreRequests;
