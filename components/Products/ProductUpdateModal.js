import { useState, useEffect } from "react";
import { parseCookies } from "nookies";
import { useToasts } from "react-toast-notifications";
import axios from "axios";
import Spinner from "react-bootstrap/Spinner";
import catchErrors from "../../../utils/catchErrors";
import baseUrl from "../../../utils/baseUrl";

const INITIAL_PRODUCT = {
	productImage: "",
	hoverImage: "",
	name: "",
	description: "",
	price: "",
	oldPrice: "",
	onSale: "",
	discount: "",
	discountPercent: "",
	productType: "",
};

const ProductUpdateModal = ({ active, productSideModal, user, store }) => {
	const { livani_token } = parseCookies();
	const { addToast } = useToasts();
	const [createProduct, setCreateProduct] = useState(INITIAL_PRODUCT);
	const [error, setError] = useState("");
	const [category, setCategory] = useState("");
	const [sale, setSale] = useState("true");
	const [discountStatus, setDiscountStatus] = useState("true");
	const [mediaPreview, setMediaPreview] = useState("");
	const [hoverMediaPreview, setHoverMediaPreview] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		setCreateProduct({});
	}, []);

	const handleChange = (e) => {
		const { name, value, files } = e.target;
		if (name === "media") {
			let fileSize = files[0].size / 1024 / 1024;
			if (fileSize > 2) {
				e.target.value = null;
				return;
			}
			setCreateProduct((prevState) => ({
				...prevState,
				productImage: files[0],
			}));
			setMediaPreview(window.URL.createObjectURL(files[0]));
		} else if (name === "hoverImage") {
			let fileSize = files[0].size / 1024 / 1024;
			if (fileSize > 2) {
				e.target.value = null;
				return;
			}
			setCreateProduct((prevState) => ({
				...prevState,
				hoverImage: files[0],
			}));
			setHoverMediaPreview(window.URL.createObjectURL(files[0]));
		} else {
			setCreateProduct((prevState) => ({ ...prevState, [name]: value }));
		}
	};

	const handleImageUpload = async () => {
		const data = new FormData();
		data.append("file", createProduct.productImage);
		data.append("upload_preset", process.env.UPLOAD_PRESET);
		data.append("cloud_name", process.env.CLOUD_NAME);
		const response = await axios.post(process.env.CLOUDINARY_URL, data);

		const mediaUrl = response.data.url;
		return mediaUrl;
	};

	const handleHoverImageUpload = async () => {
		const data = new FormData();
		data.append("file", createProduct.hoverImage);
		data.append("upload_preset", process.env.UPLOAD_PRESET);
		data.append("cloud_name", process.env.CLOUD_NAME);
		const response = await axios.post(process.env.CLOUDINARY_URL, data);

		const hoverMediaUrl = response.data.url;
		return hoverMediaUrl;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			setLoading(true);
			setError("");
			let mediaUrl = "";
			if (createProduct.productImage) {
				const imageUrl = await handleImageUpload();
				mediaUrl = imageUrl.replace(/^http:\/\//i, "https://");
			}
			//hover image
			let hoverMediaUrl = "";
			if (createProduct.productImage) {
				const imageUrl = await handleHoverImageUpload();
				hoverMediaUrl = imageUrl.replace(/^http:\/\//i, "https://");
			}

			const url = `${baseUrl}/api/v1/products`;

			const { name, description, price, oldPrice, discountPercent } =
				createProduct;

			const payload = {
				storeId: store.id,
				userId: user.id,
				productImage: mediaUrl,
				hoverImage: hoverMediaUrl,
				name,
				description,
				price,
				oldPrice,
				onSale: sale,
				discount: discountStatus,
				discountPercent,
				productType: category,
			};

			await axios.post(url, payload, {
				headers: { Authorization: livani_token },
			});

			setLoading(false);
			setCreateProduct(INITIAL_PRODUCT);
			productSideModal();
			addToast("Product created successfully.", {
				appearance: "success",
			});
		} catch (error) {
			catchErrors(error, setError);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<div
				className={
					active
						? "admin-product-modal active"
						: "admin-product-modal"
				}
			>
				<div className="modal-innter-content">
					<button
						type="button"
						className="close"
						onClick={productSideModal}
					>
						<span aria-hidden="true">
							<i className="bx bx-x"></i>
						</span>
					</button>

					<div className="modal-body">
						<h3>Add Product</h3>

						<form onSubmit={handleSubmit}>
							<div className="form-group">
								<label>Upload your Product image here</label>
								<div className="upload-img">
									<span>
										<i className="bx bxs-image-add"></i>
										Click here or drop files to upload
									</span>

									<input
										type="file"
										className="form-control-file"
										name="media"
										onChange={handleChange}
									/>
								</div>
								{mediaPreview && (
									<div className="uploaded-img">
										<img
											src={mediaPreview}
											alt="Image"
											className="img-thumbnail"
										/>
									</div>
								)}
							</div>

							<div className="form-group">
								<label>
									Upload your Product hover image here
								</label>
								<div className="upload-img">
									<span>
										<i className="bx bxs-image-add"></i>
										Click here or drop files to upload
									</span>

									<input
										type="file"
										className="form-control-file"
										name="hoverImage"
										onChange={handleChange}
									/>
								</div>
								{hoverMediaPreview && (
									<div className="uploaded-img">
										<img
											src={hoverMediaPreview}
											alt="Image"
											className="img-thumbnail"
										/>
									</div>
								)}
							</div>

							<h4 className="title">
								Add your Product description and necessary
								information from here
							</h4>

							<div className="form-group">
								<label>Name</label>
								<input
									type="text"
									className="form-control"
									name="name"
									value={createProduct.name}
									onChange={handleChange}
								/>
							</div>

							<div className="form-group">
								<label>Description</label>
								<textarea
									className="form-control"
									rows="3"
									name="description"
									value={createProduct.description}
									onChange={handleChange}
								/>
							</div>

							<div className="form-group">
								<label>Price</label>
								<input
									type="number"
									className="form-control"
									name="price"
									value={createProduct.price}
									onChange={handleChange}
								/>
							</div>

							<div className="form-group">
								<label>Old Price</label>
								<input
									type="number"
									className="form-control"
									name="oldPrice"
									value={createProduct.oldPrice}
									onChange={handleChange}
								/>
							</div>

							<div className="form-group">
								<label>On Sale?</label>
								<select
									className="form-control"
									onChange={(e) => setSale(e.target.value)}
								>
									<option value="true">Yes</option>
									<option value="false">No</option>
								</select>
							</div>

							<div className="form-group">
								<label>Discount?</label>
								<select
									className="form-control"
									onChange={(e) =>
										setDiscountStatus(e.target.value)
									}
								>
									<option value="true">Yes</option>
									<option value="false">No</option>
								</select>
							</div>

							<div className="form-group">
								<label>Discount In Percent (1 or 10 ...)</label>
								<input
									type="number"
									className="form-control"
									name="discountPercent"
									value={createProduct.discountPercent}
									onChange={handleChange}
								/>
							</div>

							<div className="form-group">
								<label>Product Type</label>
								<select
									className="form-control"
									onChange={(e) =>
										setCategory(e.target.value)
									}
								>
									<option>Select Category</option>
									<option value="T-Shirt">T-Shirt</option>
									<option value="Bags">Bags</option>
									<option value="Shoes">Shoes</option>
									<option value="Women Clothes">
										Women Clothes
									</option>
									<option value="medical">
										Medical Equipment
									</option>
									<option value="grocery">Grocery</option>
									<option value="electronics">
										Electronics
									</option>
									<option value="furniture">Furniture</option>
									<option value="jewelry">Jewelry</option>
								</select>
							</div>

							<div className="modal-btn">
								<div
									className="btn optional-btn float-left"
									onClick={productSideModal}
								>
									Cancel
								</div>
								<button className="btn default-btn float-right">
									Create Product
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
						</form>
					</div>
				</div>
			</div>
		</>
	);
};

export default ProductUpdateModal;
