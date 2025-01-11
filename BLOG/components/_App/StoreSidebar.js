import React, { useState } from "react";
import Link from "../../utils/ActiveLink";

const StoreSidebar = ({ user }) => {
	const [layoutCls, setLayoutCls] = useState(false);

	const handleLayoutCls = (e) => {
		setLayoutCls(e);
	};

	return (
		<>
			<nav className={`admin-sidebar ${layoutCls ? "active" : null}`}>
				<ul>
					<li className="nav-item">
						<Link href="/stores/dashboard" activeClassName="active">
							<a className="nav-link">
								<i className="bx bx-home-alt"></i>
								Dashboard
							</a>
						</Link>
					</li>
					<li className="nav-item" title="Coming Soon">
						<Link href="/stores/products" activeClassName="active">
							<a className="nav-link">
								<i className="bx bx-cart"></i>
								My Products
							</a>
						</Link>
					</li>

					<li className="nav-item">
						<Link href="/" activeClassName="active">
							<a className="nav-link">
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

export default StoreSidebar;
