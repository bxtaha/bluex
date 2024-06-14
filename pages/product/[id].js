import TopHeader from "../../components/Layouts/TopHeader";
import Navbar from "../../components/Layouts/Navbar";
import PageBanner from "../../components/Common/PageBanner";
import ProductDetailsStyleOne from "../../components/ProductDetails/ProductDetailsStyleOne";
import FacilitySlider from "../../components/Common/FacilitySlider";
import InstagramFeed from "../../components/Common/InstagramFeed";
import Footer from "../../components/Layouts/Footer";

import axios from "axios";
import baseUrl from "../../utils/baseUrl";

const Product = ({ product, user, store, products }) => {
	return (
		<>
			<TopHeader user={user} />
			<Navbar user={user} store={store} />
			<PageBanner
				pageTitle="Long Sleeve Leopard T-Shirt"
				homePageUrl="/"
				homePageText="Home"
				activePageText="Long Sleeve Leopard T-Shirt"
			/>
			<ProductDetailsStyleOne product={product} products={products} />
			<FacilitySlider />
			<InstagramFeed />
			<Footer />
		</>
	);
};

export async function getServerSideProps({ query }) {
	const id = query.id;
	const res = await axios.get(`${baseUrl}/api/v1/products/${id}`);
	const product = await res.data;

	//all products
	const page = query.page ? query.page : "1";

	const payload = {
		params: {
			page,
			limit: 10,
		},
	};

	const url = `${baseUrl}/api/v1/products`;

	const response = await axios.get(url, payload);
	const { products } = response.data;

	return {
		props: {
			product,
			products,
		},
	};
}

export default Product;
