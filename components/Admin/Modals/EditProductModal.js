import { useState, useEffect, useCallback } from "react";
import { parseCookies } from "nookies";
import { useToasts } from "react-toast-notifications";
import { useDropzone } from "react-dropzone";
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
	newProduct: "",
	availability: "",
	offer: "",
	onSale: "",
	discount: "",
	discountPercent: "",
	productType: "",
};

const ProductUpdateModal = ({
	handleEdit,
	user,
	store,
	productUpdate,
	activeEditModal,
	setProductList,
}) => {
	const { livani_token } = parseCookies();
	const { addToast } = useToasts();
	const [createProduct, setCreateProduct] = useState(INITIAL_PRODUCT);
	const [error, setError] = useState("");
	const [category, setCategory] = useState("");
	const [sale, setSale] = useState("true");
	const [newProduct, setNewProduct] = useState("true");
	const [newOffer, setNewOffer] = useState("true");
	const [discountStatus, setDiscountStatus] = useState("true");
	const [hoverMediaPreview, setHoverMediaPreview] = useState("");
	const [loading, setLoading] = useState(false);
	const [imageFiles, setImageFiles] = useState([]);
	const [disable, setDisable] = useState(true);

	const onDrop = useCallback((acceptedFiles) => {
		setDisable(false);
		acceptedFiles.forEach(async (acceptedFile) => {
			const data = new FormData();
			data.append("file", acceptedFile);

			data.append("upload_preset", process.env.UPLOAD_PRESET);
			data.append("cloud_name", process.env.CLOUD_NAME);

			const response = await axios.post(process.env.CLOUDINARY_URL, data);
			const mediaUrl = await response.data.url;

			setImageFiles((old) => [...old, mediaUrl]);
		});
	}, []);

	const { getRootProps, getInputProps } = useDropzone({
		accept: "image/*",
		onDrop,
	});

	const thumbs = imageFiles.map((file, i) => (
		<div key={i} className="drop-gallery-thumb">
			<img src={file} className="img-thumbnail" />
		</div>
	));

	useEffect(
		() => () => {
			// Make sure to revoke the data uris to avoid memory leaks
			imageFiles.forEach((file) => URL.revokeObjectURL(file.preview));
		},
		[imageFiles]
	);

	useEffect(() => {
		setCreateProduct({
			productImage: productUpdate.productImage,
			hoverImage: productUpdate.hoverImage,
			name: productUpdate.name,
			description: productUpdate.description,
			price: productUpdate.price,
			oldPrice: productUpdate.oldPrice,
			newProduct: productUpdate.newProduct,
			availability: productUpdate.availability,
			offer: productUpdate.offer,
			onSale: productUpdate.onSale,
			discount: productUpdate.discount,
			discountPercent: productUpdate.discountPercent,
			productType: productUpdate.productType,
		});
	}, [productUpdate]);

	const handleChange = (e) => {
		setDisable(false);
		const { name, value, files } = e.target;
		if (name === "hoverImage") {
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

			//hover image
			let hoverMediaUrl = "";
			if (createProduct.productImage) {
				const imageUrl = await handleHoverImageUpload();
				hoverMediaUrl = imageUrl.replace(/^http:\/\//i, "https://");
			}

			const url = `${baseUrl}/api/v1/products`;

			const {
				productImage,
				name,
				description,
				price,
				oldPrice,
				discountPercent,
				availability,
			} = createProduct;

			const payload = {
				id: productUpdate.id,
				storeId: store.id,
				userId: user.id,
				productImage: imageFiles.length > 0 ? imageFiles : productImage,
				hoverImage: hoverMediaUrl ? hoverMediaUrl : hoverImage,
				name,
				description,
				price,
				oldPrice,
				newProduct,
				availability,
				offer: newOffer,
				onSale: sale,
				discount: discountStatus,
				discountPercent,
				productType: category,
			};

			const response = await axios.put(url, payload, {
				headers: { Authorization: livani_token },
			});

			setProductList(response.data.products);
			setLoading(false);
			setCreateProduct(INITIAL_PRODUCT);

			addToast("Product Updated successfully.", {
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
					activeEditModal
						? "admin-product-modal active"
						: "admin-product-modal"
				}
			>
				<div className="modal-innter-content">
					<div className="modal-body">
						<button
							type="button"
							className="close"
							onClick={handleEdit}
						>
							<span aria-hidden="true">
								<i className="bx bx-x"></i>
							</span>
						</button>

						<h3>Update Product</h3>

						<form onSubmit={handleSubmit}>
							<div className="form-group">
								<label>Upload your Product image here</label>
								<div className="upload-img" {...getRootProps()}>
									<span>
										<i className="bx bxs-image-add"></i>
										Click here or drop files to upload
									</span>

									<div className="dropzone add-listings-box">
										<div className="file-upload-box">
											<input {...getInputProps()} />
										</div>
									</div>
								</div>

								<div className="dropzone add-listings-box">
									{imageFiles.length === 1 && (
										<div className="gallery-flex-single">
											{thumbs}
											<input {...getInputProps()} />
										</div>
									)}
									{imageFiles.length > 1 && (
										<div className="gallery-flex">
											{thumbs}
											<input {...getInputProps()} />
										</div>
									)}
								</div>
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
									value={createProduct.name || ""}
									onChange={handleChange}
								/>
							</div>

							<div className="form-group">
								<label>Description</label>
								<textarea
									className="form-control"
									rows="5"
									name="description"
									value={createProduct.description || ""}
									onChange={handleChange}
								/>
							</div>

							<div className="form-group">
								<label>Price</label>
								<input
									type="number"
									className="form-control"
									name="price"
									value={createProduct.price || ""}
									onChange={handleChange}
								/>
							</div>

							<div className="form-group">
								<label>Old Price</label>
								<input
									type="number"
									className="form-control"
									name="oldPrice"
									value={createProduct.oldPrice || ""}
									onChange={handleChange}
								/>
							</div>

							<div className="form-group">
								<label>New Product?</label>
								<select
									className="form-control"
									onChange={(e) =>
										setNewProduct(e.target.value)
									}
								>
									<option value="true">Yes</option>
									<option value="false">No</option>
								</select>
							</div>

							<div className="form-group">
								<label>Available Items</label>
								<input
									type="number"
									className="form-control"
									name="availability"
									value={createProduct.availability || ""}
									onChange={handleChange}
								/>
							</div>

							<div className="form-group">
								<label>Offer</label>
								<select
									className="form-control"
									onChange={(e) =>
										setNewOffer(e.target.value)
									}
								>
									<option value="true">Yes</option>
									<option value="false">No</option>
								</select>
							</div>

							<div className="form-group">
								<label>On Sale?</label>
								<select
									className="form-control"
									onChange={(e) => {
										setSale(e.target.value);
										setDisable(false);
									}}
								>
									<option value="true">Yes</option>
									<option value="false">No</option>
								</select>
							</div>

							<div className="form-group">
								<label>Discount?</label>
								<select
									className="form-control"
									onChange={(e) => {
										setDiscountStatus(e.target.value);
										setDisable(false);
									}}
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
									onChange={handleChange}
								/>
							</div>

							<div className="form-group">
								<label>Product Type</label>
								<select
									className="form-control"
									onChange={(e) => {
										setCategory(e.target.value);
										setDisable(false);
									}}
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
									onClick={handleEdit}
								>
									Cancel
								</div>
								<button
									className={
										disable
											? "isDisabled btn default-btn float-right"
											: "btn default-btn float-right"
									}
								>
									Update Product
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
