import LeftSidebar from "../../components/Admin/LeftSidebar";
import SalesInfo from "../../components/Admin/SalesInfo";
import MonthlyRevenue from "../../components/Admin/MonthlyRevenue";
import ProductTrendsByMonth from "../../components/Admin/ProductTrendsByMonth";

const Dashboard = ({ user, store }) => {
	return (
		<>
			<LeftSidebar user={user} store={store} />

			<div className="admin-main-content d-flex flex-column">
				<div className="page-header">
					<h2>Dashboard</h2>
				</div>
				<SalesInfo />
				<MonthlyRevenue />
				<ProductTrendsByMonth />

				{/* Footer */}
				<div className="flex-grow-1"></div>
			</div>
		</>
	);
};

export default Dashboard;
