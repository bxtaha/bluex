import React, { Component } from 'react';
import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import ProductDetailsStyleThree from '../components/ProductDetails/ProductDetailsStyleThree';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';

class ProductsType3 extends Component {
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
                <ProductDetailsStyleThree />
                <FacilitySlider />
                <InstagramFeed />
                <Footer />
            </>
        );
    }
}

export default ProductsType3;