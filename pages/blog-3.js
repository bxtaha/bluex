import React, { Component } from "react";
import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";
import PageBanner from "../components/Common/PageBanner";
import BlogGridFour from "../components/Blog/BlogGridFour";
import FacilitySlider from "../components/Common/FacilitySlider";
import InstagramFeed from "../components/Common/InstagramFeed";
import Footer from "../components/Layouts/Footer";

const Blog3 = ({ user, store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Blog Grid (4 in Row)"
        homePageUrl="/"
        homePageText="Home"
        activePageText="Blog"
      />
      <BlogGridFour />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Blog3;
