import React, { Component } from "react";
import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";
import PageBanner from "../components/Common/PageBanner";
import GalleryFourGridFullWidth from "../components/Gallery/GalleryFourGridFullWidth";
import FacilitySlider from "../components/Common/FacilitySlider";
import InstagramFeed from "../components/Common/InstagramFeed";
import Footer from "../components/Layouts/Footer";

const Gallery4 = ({ user, store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Gallery Full Width (4 in Row)"
        homePageUrl="/"
        homePageText="Home"
        activePageText="Gallery"
      />
      <GalleryFourGridFullWidth />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Gallery4;
