import { useState } from "react";
import { parseCookies } from "nookies";
import { Alert, Modal, Button, Container, Row } from "react-bootstrap";
import axios from "axios";
import Spinner from "react-bootstrap/Spinner";
import baseUrl from "../../utils/baseUrl";
import catchErrors from "../../utils/catchErrors";

const INITIAL_REQUEST = {
	storeName: "",
	email: "",
	webs: "",
	aboutText: "",
};

const SaleRequestArea = () => {
	const { livani_token } = parseCookies();
	const [request, setRequest] = useState(INITIAL_REQUEST);
	const [error, setError] = useState("");
	const [show, setShow] = useState(false);
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState("");

	const handleClose = () => setShow(false);
	const handleShow = () => setShow(true);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setRequest((prevState) => ({ ...prevState, [name]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			setLoading(true);

			const url = `${baseUrl}/api/v1/store/create`;
			const payload = { ...request };
			const headers = { headers: { Authorization: livani_token } };
			const response = await axios.post(url, payload, headers);
			setSuccess(response.data);
			setLoading(false);
			setRequest(INITIAL_REQUEST);
			handleClose();
		} catch (error) {
			catchErrors(error, setError);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<div className="store-request">
				<div className="lg-col-12 button-center">
					{success ? (
						<Alert
							variant="success"
							show={success ? true : false}
							className="success-text"
						>
							{success}
						</Alert>
					) : (
						""
					)}
				</div>
				<div className="request-image">
					<img
						src="https://res.cloudinary.com/dev-empty/image/upload/v1630831419/5703647.jpg"
						alt="about"
					/>
				</div>

				<Button
					variant="primary"
					onClick={handleShow}
					className="request-button default-btn"
				>
					Request
				</Button>

				<Modal centered show={show} onHide={handleClose}>
					<Modal.Header
						closeButton
						className="close-button"
					></Modal.Header>
					<Modal.Body>
						<Container>
							<Row>
								<div className="dashboard-area">
									<div className="row deal-center">
										<div className="col-lg-12 col-md-12">
											<div className="form-heading text-center">
												<h3 className="form-title">
													Store Request
												</h3>
											</div>
											<div className="lg-col-12 button-center">
												{success ? (
													<Alert
														variant="success"
														show={
															success
																? true
																: false
														}
													>
														{success}
													</Alert>
												) : (
													""
												)}

												{error ? (
													<Alert
														variant="danger"
														show={
															error ? true : false
														}
													>
														{error}
													</Alert>
												) : (
													""
												)}
											</div>

											<div className="dashboard-stats">
												<form onSubmit={handleSubmit}>
													<div className="row">
														<div className="col-lg-12 col-md-12">
															<div className="form-group">
																<label>
																	Store Name
																</label>
																<input
																	type="text"
																	name="name"
																	className="form-control"
																	value={
																		request.name ||
																		""
																	}
																	onChange={
																		handleChange
																	}
																/>
															</div>
														</div>

														<div className="col-lg-12 col-md-12">
															<div className="form-group">
																<label>
																	Email
																</label>
																<input
																	type="text"
																	name="email"
																	className="form-control"
																	value={
																		request.email ||
																		""
																	}
																	onChange={
																		handleChange
																	}
																/>
															</div>
														</div>

														<div className="col-lg-12 col-md-6">
															<div className="form-group">
																<label>
																	Website
																</label>
																<input
																	type="text"
																	name="web"
																	className="form-control"
																	value={
																		request.web ||
																		""
																	}
																	onChange={
																		handleChange
																	}
																/>
															</div>
														</div>

														<div className="col-lg-12 col-md-12">
															<div className="form-group">
																<label>
																	About
																</label>
																<textarea
																	cols="30"
																	rows="3"
																	type="text"
																	name="aboutText"
																	className="form-control"
																	value={
																		request.aboutText ||
																		""
																	}
																	onChange={
																		handleChange
																	}
																></textarea>
															</div>
														</div>

														<div className="col-lg-12 col-md-12 button-center">
															<button
																type="submit"
																className="default-btn"
															>
																Submit
																{loading ? (
																	<Spinner
																		color="success"
																		className="product-spinner"
																		animation="border"
																		size="sm"
																	/>
																) : (
																	""
																)}
															</button>
														</div>
													</div>
												</form>
											</div>
										</div>
									</div>
								</div>
							</Row>
						</Container>
					</Modal.Body>
				</Modal>
			</div>
		</>
	);
};

export default SaleRequestArea;
