import React, { useState, useEffect } from "react";
import Link from "../../utils/ActiveLink";
import AddProductModal from "./Modals/AddProductModal";
import { handleLogout } from "../../utils/auth";

const TopNavbar = ({ user, store }) => {
	const [isMounted, setIsMounted] = useState(false);
	const [active, setActive] = useState(false);

	useEffect(() => {
		setIsMounted(false);
	}, []);

	const productSideModal = () => {
		setActive(!active);
	};

	return (
		<>
			<div className="Toastify__toast-container Toastify__toast-container--bottom-center">
				<div className="Toastify__toast Toastify__toast--warning">
					<div role="alert" className="Toastify__toast-body">
						<i className="bx bx-info-circle"></i> Some functions may
						not work because of storefront vulnerability!
					</div>
					<div
						className="Toastify__progress-bar Toastify__progress-bar--controlled Toastify__progress-bar--warning"
						style={{
							animationDuration: "50000ms",
							animationPlayState: "paused",
							opacity: "1",
							transform: "scaleX(0)",
						}}
					></div>
				</div>
			</div>
			<nav className="navbar navbar-expand admin-top-navbar">
				<Link href="/admin/dashboard">
					<a className="navbar-brand">
						<img src="../../images/logo.png" a="logo" />
					</a>
				</Link>

				{/* Burger menu */}
				<div className="burger-menu x">
					<span className="top-bar"></span>
					<span className="middle-bar"></span>
					<span className="bottom-bar"></span>
				</div>

				<div
					className="collapse navbar-collapse show"
					id="navbarSupportedContent"
				>
					<ul className="navbar-nav ms-auto">
						<li className="nav-item add-products">
							<Link href="#" activeClassName="active">
								<a
									className="nav-link"
									onClick={productSideModal}
								>
									Add Products
								</a>
							</Link>
						</li>

						<li className="nav-item profile">
							<Link href="#">
								<a className="nav-link">
									<i className="bx bx-user "></i>{" "}
									{user && user.name}{" "}
								</a>
							</Link>

							<ul className="dropdown-menu">
								<li className="nav-item">
									<Link
										href="/admin/dashboard"
										activeClassName="active"
									>
										<a className="nav-link">Dashboard</a>
									</Link>
								</li>
								<li className="nav-item">
									{store && store.status === "approved" && (
										<Link
											href="/stores/dashboard"
											activeClassName="active"
										>
											<a className="nav-link">
												Store Dashboard
											</a>
										</Link>
									)}
								</li>

								<li className="nav-item">
									<Link
										href="/profile"
										activeClassName="active"
									>
										<a className="nav-link"> My Profile</a>
									</Link>
								</li>

								<li className="nav-item">
									<Link href="#" activeClassName="active">
										<a
											onClick={handleLogout}
											className="nav-link"
										>
											Sign out
										</a>
									</Link>
								</li>
							</ul>
						</li>
					</ul>
				</div>
			</nav>

			{/* Sidebar Modal */}
			<AddProductModal
				active={active}
				productSideModal={productSideModal}
				user={user}
				store={store}
			/>
		</>
	);
};

export default TopNavbar;
