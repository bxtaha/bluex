import React, { Component } from "react";
import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";
import PageBanner from "../components/Common/PageBanner";
import CategoriesTwoGrid from "../components/Categories/CategoriesTwoGrid";
import FacilitySlider from "../components/Common/FacilitySlider";
import InstagramFeed from "../components/Common/InstagramFeed";
import Footer from "../components/Layouts/Footer";

const Categories1 = ({ user, store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Categories (2 in Row)"
        homePageUrl="/"
        homePageText="Home"
        activePageText="Categories"
      />
      <CategoriesTwoGrid />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Categories1;
