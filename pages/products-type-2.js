import React, { Component } from 'react';
import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import ProductDetailsStyleTwo from '../components/ProductDetails/ProductDetailsStyleTwo';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';

const ProductsType2 = ({product}) => {
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

            <ProductDetailsStyleTwo product={product} />

            <FacilitySlider />
            <InstagramFeed />
            <Footer />
        </>
    )
}



export default ProductsType2;