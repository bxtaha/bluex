import { useState } from "react";
import { parseCookies } from "nookies";
import { useToasts } from "react-toast-notifications";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import Router from "next/router";
import baseUrl from "../../utils/baseUrl";
import catchErrors from "../../utils/catchErrors";
import StripeCheckout from "react-stripe-checkout";
import OrderSummary from "./OrderSummary";

const INITIAL_USERDETAILS = {
	country: "",
	name: "",
	companyName: "",
	address: "",
	city: "",
	email: "",
	phone: "",
};

function CheckoutContent({ user, store }) {
	const dispatch = useDispatch();
	const [userDetails, setuserDetails] = useState(INITIAL_USERDETAILS);
	const { addToast } = useToasts();
	const { livani_token } = parseCookies();
	const [countryName, setcountryName] = useState("Browse Category");
	const [loading, setLoading] = useState(false);
	const cartItems = useSelector((state) => state.cartItems);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setuserDetails((prevState) => ({ ...prevState, [name]: value }));
	};

	const totalPrice =
		cartItems.length > 0 &&
		cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

	const handleCheckout = async (paymentData) => {
		try {
			const { name, address, city, phone, email } = userDetails;

			const productDetails = {
				orderItems: cartItems,
				country: countryName,
				name,
				address,
				city,
				phone,
				email,
				totalPrice,
			};

			const url = `${baseUrl}/api/v1/checkout`;
			const payload = { paymentData, productDetails };
			await axios.post(url, payload, {
				headers: { Authorization: livani_token },
			});
			dispatch({
				type: "CLEAR_CART_ITEMS",
			});

			addToast("Order Placed Successfully", {
				appearance: "success",
			});

			Router.push("/");
		} catch (error) {
			catchErrors(error, window.alert);
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="checkout-area ptb-100">
			<div className="container">
				<div className="row">
					<div className="col-lg-12 col-md-12">
						<div className="user-actions">
							<i className="icofont-ui-file"></i>
							<span>
								Returning customer?{" "}
								<a href="#">Click here to login!</a>
							</span>
						</div>
					</div>
				</div>

				<form onSubmit={(e) => e.preventDefault()}>
					<div className="row">
						<div className="col-lg-6 col-md-12">
							<div className="billing-details">
								<h3 className="title">Billing Details</h3>

								<div className="row">
									<div className="col-lg-12 col-md-12">
										<div className="form-group">
											<label>
												Country{" "}
												<span className="required">
													*
												</span>
											</label>

											<div className="select-box">
												<select
													className="form-control"
													onChange={(e) =>
														setcountryName(
															e.target.value
														)
													}
												>
													<option value="usa">
														United Arab Emirates
													</option>
													<option value="china">
														China
													</option>
													<option value="united kingdom">
														United Kingdom
													</option>
													<option value="germany">
														Germany
													</option>
													<option value="france">
														France
													</option>
													<option value="japan">
														Japan
													</option>
												</select>
											</div>
										</div>
									</div>

									<div className="col-lg-12 col-md-12">
										<div className="form-group">
											<label>
												Name{" "}
												<span className="required">
													*
												</span>
											</label>
											<input
												type="text"
												className="form-control"
												name="name"
												value={userDetails.name}
												onChange={handleChange}
											/>
										</div>
									</div>

									<div className="col-lg-12 col-md-12">
										<div className="form-group">
											<label>Company Name</label>
											<input
												type="text"
												className="form-control"
												name="companyName"
												value={userDetails.companyName}
												onChange={handleChange}
											/>
										</div>
									</div>

									<div className="col-lg-12 col-md-6">
										<div className="form-group">
											<label>
												Address{" "}
												<span className="required">
													*
												</span>
											</label>
											<input
												type="text"
												className="form-control"
												name="address"
												value={userDetails.address}
												onChange={handleChange}
											/>
										</div>
									</div>

									<div className="col-lg-12 col-md-6">
										<div className="form-group">
											<label>
												Town / City{" "}
												<span className="required">
													*
												</span>
											</label>
											<input
												type="text"
												className="form-control"
												name="city"
												value={userDetails.city}
												onChange={handleChange}
											/>
										</div>
									</div>

									<div className="col-lg-6 col-md-6">
										<div className="form-group">
											<label>
												Postcode / Zip{" "}
												<span className="required">
													*
												</span>
											</label>
											<input
												type="text"
												name="zip"
												className="form-control"
											/>
										</div>
									</div>

									<div className="col-lg-6 col-md-6">
										<div className="form-group">
											<label>
												Email Address{" "}
												<span className="required">
													*
												</span>
											</label>
											<input
												type="email"
												className="form-control"
												name="email"
												value={userDetails.email}
												onChange={handleChange}
											/>
										</div>
									</div>

									<div className="col-lg-12 col-md-12">
										<div className="form-group">
											<label>
												Phone{" "}
												<span className="required">
													*
												</span>
											</label>
											<input
												type="text"
												className="form-control"
												name="phone"
												value={userDetails.phone}
												onChange={handleChange}
											/>
										</div>
									</div>

									<div className="col-lg-12 col-md-12">
										<div className="form-group">
											<textarea
												name="notes"
												id="notes"
												cols="30"
												rows="4"
												placeholder="Order Notes"
												className="form-control"
											></textarea>
										</div>
									</div>
								</div>
							</div>
						</div>

						<OrderSummary
							StripeCheckout={StripeCheckout}
							totalPrice={totalPrice}
							handleCheckout={handleCheckout}
							user={user}
						/>
					</div>
				</form>
			</div>
		</section>
	);
}

export default CheckoutContent;
