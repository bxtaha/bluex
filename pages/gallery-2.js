import React, { Component } from "react";
import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";
import PageBanner from "../components/Common/PageBanner";
import GalleryGridThree from "../components/Gallery/GalleryGridThree";
import FacilitySlider from "../components/Common/FacilitySlider";
import InstagramFeed from "../components/Common/InstagramFeed";
import Footer from "../components/Layouts/Footer";

const Gallery2 = ({ user, store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Gallery Grid (3 in Row)"
        homePageUrl="/"
        homePageText="Home"
        activePageText="Gallery"
      />
      <GalleryGridThree />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Gallery2;
