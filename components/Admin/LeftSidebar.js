import React, { useState } from "react";
import Link from "../../utils/ActiveLink";
import TopNavbar from "./TopNavbar";

const LeftSidebar = ({ user, store }) => {
	const [layoutCls, setLayoutCls] = useState(false);

	const handleLayoutCls = (e) => {
		setLayoutCls(e);
	};

	return (
		<>
			<TopNavbar
				onChangeClass={handleLayoutCls}
				user={user}
				store={store}
			/>
			<nav className={`admin-sidebar ${layoutCls ? "active" : null}`}>
				<ul>
					<li className="nav-item">
						<Link href="/admin/dashboard" activeClassName="active">
							<a className="nav-link">
								<i className="bx bx-home-alt"></i>
								Dashboard
							</a>
						</Link>
					</li>
					<li className="nav-item" title="Coming Soon">
						<Link href="/admin/products" activeClassName="active">
							<a className="nav-link">
								<i className="bx bx-cart"></i>
								Products
							</a>
						</Link>
					</li>
					<li className="nav-item" title="Coming Soon">
						<Link href="/admin/orders" activeClassName="active">
							<a className="nav-link">
								<i className="bx bx-shopping-bag"></i>
								Orders
							</a>
						</Link>
					</li>
					{user && user.role === "super-admin" ? (
						<>
							<li className="nav-item" title="Coming Soon">
								<Link
									href="/admin/customers"
									activeClassName="active"
								>
									<a className="nav-link">
										<i className="bx bx-user-circle"></i>
										Customers
									</a>
								</Link>
							</li>
							<li className="nav-item" title="Coming Soon">
								<Link
									href="/admin/users"
									activeClassName="active"
								>
									<a className="nav-link">
										<i className="bx bxs-user-plus"></i>
										Admin/Users
									</a>
								</Link>
							</li>
							<li className="nav-item" title="Coming Soon">
								<Link
									href="/admin/store-requests"
									activeClassName="active"
								>
									<a className="nav-link">
										<i className="bx bx-git-pull-request"></i>
										Requests
									</a>
								</Link>
							</li>
						</>
					) : (
						""
					)}

					<li className="nav-item">
						<Link href="/" activeClassName="active">
							<a target="_blank" className="nav-link">
								<i className="bx bx-link"></i>
								Storefront!
							</a>
						</Link>
					</li>
				</ul>
			</nav>
		</>
	);
};

export default LeftSidebar;
