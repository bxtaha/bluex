import LeftSidebar from "../../components/Admin/LeftSidebar";

import axios from "axios";
import baseUrl from "../../utils/baseUrl";
import UserWithPermission from "../../components/Users/UserWithPermission";

const Users = ({ user, store, users, totalPages }) => {
	return (
		<>
			<LeftSidebar user={user} store={store} />

			<div className="admin-main-content d-flex flex-column">
				<div className="page-header">
					<h2>Customers</h2>
				</div>

				<UserWithPermission
					users={users}
					totalPages={totalPages}
					user={user}
				/>

				{/* Footer */}
				<div className="flex-grow-1"></div>
			</div>
		</>
	);
};

export async function getServerSideProps(ctx) {
	const page = ctx.query.page ? ctx.query.page : "1";

	const payload = {
		params: {
			page,
			limit: 10,
		},
	};

	const url = `${baseUrl}/api/v1/users`;

	const response = await axios.get(url, payload);
	const { users, totalPages } = response.data;

	return {
		props: {
			users,
			totalPages,
		},
	};
}

export default Users;
