import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import ProductDetailsStyleOne from '../components/ProductDetails/ProductDetailsStyleOne';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';

import axios from 'axios';
import baseUrl from '../utils/baseUrl';

const Product = ({product}) => {

    return (
        <>
            <TopHeader />
            <Navbar />
            <PageBanner 
                pageTitle="Long Sleeve Leopard T-Shirt" 
                homePageUrl="/" 
                homePageText="Home" 
                activePageText="Long Sleeve Leopard T-Shirt" 
            /> 
            <ProductDetailsStyleOne product={product} />
            <FacilitySlider />
            <InstagramFeed />
            <Footer />
        </>
    );
}

export async function getServerSideProps(ctx) {

  
    const url = `${baseUrl}/api/v1/product/${id}`;
  
    const response = await axios.get(url, payload);
    const { product } = response.data;
  
    return {
      props: {
        product
      },
    };
  }

export default Product;