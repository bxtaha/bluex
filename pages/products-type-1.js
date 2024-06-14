import React, { Component } from 'react';
import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import ProductDetailsStyleOne from '../components/ProductDetails/ProductDetailsStyleOne';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';

class ProductsType1 extends Component {
    render() {
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
                <ProductDetailsStyleOne />
                <FacilitySlider />
                <InstagramFeed />
                <Footer />
            </>
        );
    }
}

export default ProductsType1;