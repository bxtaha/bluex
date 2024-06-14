import React, { useState } from "react";
import Link from "next/link";
import WishlistModal from "../Modals/WishlistModal";
import { handleLogout } from "../../utils/auth";

const TopHeader = ({ user }) => {
	const [wishlistModal, setWishlistModal] = useState(false);

	const toggleModalWishlist = () => {
		setWishlistModal(!wishlistModal);
	};

	return (
		<>
			<div className="top-header">
				<div className="container">
					<div className="row align-items-center">
						<div className="col-lg-6 col-md-12">
							<ul className="header-contact-info">
								<li>Welcome to Livani</li>
								<li>Call: +1-541-754-3010</li>

								<li>
									<div className="dropdown language-switcher d-inline-block">
										<button
											className="dropdown-toggle"
											type="button"
										>
											<img
												src="../../images/us-flag.jpg"
												alt="image"
											/>
											<span>
												Eng{" "}
												<i className="bx bx-chevron-down"></i>
											</span>
										</button>

										<div className="dropdown-menu">
											<Link href="#">
												<a className="dropdown-item d-flex align-items-center">
													<img
														src="../../images/germany-flag.jpg"
														className="shadow-sm"
														alt="flag"
													/>
													<span>Ger</span>
												</a>
											</Link>

											<Link href="#">
												<a className="dropdown-item d-flex align-items-center">
													<img
														src="../../images/france-flag.jpg"
														className="shadow-sm"
														alt="flag"
													/>
													<span>Fre</span>
												</a>
											</Link>

											<Link href="#">
												<a className="dropdown-item d-flex align-items-center">
													<img
														src="../../images/spain-flag.jpg"
														className="shadow-sm"
														alt="flag"
													/>
													<span>Spa</span>
												</a>
											</Link>

											<Link href="#">
												<a className="dropdown-item d-flex align-items-center">
													<img
														src="../../images/russia-flag.jpg"
														className="shadow-sm"
														alt="flag"
													/>
													<span>Rus</span>
												</a>
											</Link>

											<Link href="#">
												<a className="dropdown-item d-flex align-items-center">
													<img
														src="../../images/italy-flag.jpg"
														className="shadow-sm"
														alt="flag"
													/>
													<span>Ita</span>
												</a>
											</Link>
										</div>
									</div>
								</li>
							</ul>
						</div>

						<div className="col-lg-6 col-md-12">
							<ul className="header-top-menu">
								<li>
									<Link href="/profile">
										<a>
											<i className="bx bxs-user"></i> My
											Account
										</a>
									</Link>
								</li>

								<li>
									<Link href="#toggleModalWishlist">
										<a onClick={toggleModalWishlist}>
											<i className="bx bx-heart"></i>{" "}
											Wishlist
										</a>
									</Link>
								</li>

								<li>
									<Link href="/compare">
										<a>
											<i className="bx bx-shuffle"></i>{" "}
											Compare
										</a>
									</Link>
								</li>

								<li>
									{user ? (
										<>
											<a
												onClick={handleLogout}
												className="global-pointer"
											>
												<i className="bx bx-log-in"></i>{" "}
												Logout
											</a>
										</>
									) : (
										<Link href="/login">
											<a>
												<i className="bx bx-log-in"></i>{" "}
												Login
											</a>
										</Link>
									)}
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			{/* Wishlist Modal */}
			<WishlistModal
				onClick={toggleModalWishlist}
				active={wishlistModal ? "active" : ""}
			/>
		</>
	);
};

export default TopHeader;
