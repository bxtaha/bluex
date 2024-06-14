import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import baseUrl from "../../utils/baseUrl";
import ProductDeleteModal from "../../components/Products/ProductDeleteModal";

import Link from "next/link";
import LeftSidebar from "../../components/Admin/LeftSidebar";
import EditProductModal from "../../components/Admin/Modals/EditProductModal";
import ViewProductModal from "../../components/Admin/Modals/ViewProductModal";

const Products = ({ products, totalPages, user, store }) => {
	const router = useRouter();
	let page = parseInt(router.query.page) ? parseInt(router.query.page) : 1;
	const [active, setActive] = useState(false);
	const [activeEditModal, setActiveEditModa] = useState(false);
	const [viewProductDetail, setViewProductDetail] = useState("");
	const [productList, setProductList] = useState(products);
	const [productUpdate, setProductUpdate] = useState("");
	const [productId, setProductId] = useState("");
	const [productName, setProductName] = useState("");

	useEffect(() => {
		setProductList(products);
	}, [page]);

	const handleViewProduct = (product) => {
		setViewProductDetail(product);
		setActive(true);
	};

	const handleActiveModal = (product) => {
		setActive(!active);
	};

	const [show, setShow] = useState(false);

	const handleClose = () => setShow(false);

	const handleShow = (id, productname) => {
		setProductId(id);
		setProductName(productname);
		setShow(true);
	};

	const handleEdit = (product) => {
		setProductUpdate(product);
		setActiveEditModa(!activeEditModal);
	};

	return (
		<>
			<LeftSidebar user={user} store={store} />

			<div className="admin-main-content d-flex flex-column">
				{productList.length > 0 ? (
					<>
						{" "}
						<div className="page-header">
							<h2>Products</h2>
						</div>
						<div className="admin-products">
							<div className="row">
								{productList.length > 0 &&
									productList.map((product) => (
										<div
											className="col-lg-4 col-md-6 col-sm-6"
											key={product.id}
										>
											<div className="single-products-box">
												<div className="products-image">
													<Link href="#viewproduct">
														<a>
															<img
																src={
																	product
																		.productImage[0]
																}
																className="main-image"
																alt="image"
															/>
															<img
																src={
																	product.hoverImage
																}
																className="hover-image"
																alt="image"
															/>
														</a>
													</Link>

													{product.onSale ===
														"true" && (
														<div className="sale-tag">
															Sale!
														</div>
													)}

													<div className="new-tag">
														New!
													</div>

													<div className="products-button">
														<ul>
															<li>
																<div className="wishlist-btn">
																	<Link href="#">
																		<a
																			onClick={() =>
																				handleViewProduct(
																					product
																				)
																			}
																		>
																			<i className="bx bx-search-alt"></i>
																			<span className="tooltip-label">
																				View
																			</span>
																		</a>
																	</Link>
																</div>
															</li>
															<li>
																<div className="compare-btn">
																	<Link href="#">
																		<a
																			onClick={() =>
																				handleEdit(
																					product
																				)
																			}
																		>
																			<i className="bx bx-edit"></i>
																			<span className="tooltip-label">
																				Edit
																			</span>
																		</a>
																	</Link>
																</div>
															</li>
															<li>
																<div className="quick-view-btn">
																	<Link href="#">
																		<a
																			onClick={() =>
																				handleShow(
																					product.id,
																					product.name
																				)
																			}
																		>
																			<i className="bx bx-x"></i>
																			<span className="tooltip-label">
																				Delete
																			</span>
																		</a>
																	</Link>
																</div>
															</li>
														</ul>
													</div>
												</div>

												<div className="products-content">
													<h3>{product.name}</h3>
													<div className="price">
														<>
															<span className="old-price">
																$300
															</span>
															{/* <span className='new-price'>${product.newPrice}</span> */}
														</>

														<span className="new-price">
															${product.price}
														</span>
													</div>
												</div>
											</div>
										</div>
									))}

								{/* Pagination */}
								<div className="col-lg-12 col-md-12 col-sm-12">
									<div className="pagination-area text-center admin-pagi">
										<Link
											href={`/admin/products/?page=${
												page - 1
											}`}
										>
											<a
												className={
													page === 1
														? "isDisabled prev page-numbers"
														: "prev page-numbers"
												}
											>
												<i className="bx bx-chevrons-left"></i>
											</a>
										</Link>

										{[...Array(totalPages).keys()].map(
											(x) => (
												<span key={x + 1}>
													<Link
														href={`/admin/products?page=${
															x + 1
														}`}
													>
														<a
															className={
																x + 1 ===
																parseInt(
																	router.query
																		.page
																)
																	? "current page-numbers"
																	: "page-numbers"
															}
														>
															{x + 1}
														</a>
													</Link>
												</span>
											)
										)}

										<Link
											href={`/admin/products/?page=${
												page + 1
											}`}
										>
											<a
												className={
													page === totalPages
														? "isDisabled next page-numbers"
														: "next page-numbers"
												}
											>
												<i className="bx bx-chevrons-right"></i>
											</a>
										</Link>
									</div>
								</div>
							</div>
						</div>
						{/* Footer */}
						<div className="flex-grow-1"></div>{" "}
					</>
				) : (
					<p className="empty-store">No Products Available!</p>
				)}
			</div>

			{/* Sidebar Modal */}
			<EditProductModal
				productUpdate={productUpdate}
				activeEditModal={activeEditModal}
				handleEdit={handleEdit}
				setProductList={setProductList}
				user={user}
				store={store}
			/>
			<ViewProductModal
				viewProductDetail={viewProductDetail}
				active={active}
				handleViewProduct={handleViewProduct}
				handleActiveModal={handleActiveModal}
			/>
			<ProductDeleteModal
				show={show}
				productId={productId}
				handleClose={handleClose}
				productName={productName}
				setProductList={setProductList}
			/>
		</>
	);
};

export async function getServerSideProps(ctx) {
	const page = ctx.query.page ? ctx.query.page : "1";

	const payload = {
		params: {
			page,
			limit: 9,
		},
	};

	const url = `${baseUrl}/api/v1/products`;

	const response = await axios.get(url, payload);
	const { products, totalPages } = response.data;

	return {
		props: {
			products,
			totalPages,
		},
	};
}

export default Products;
