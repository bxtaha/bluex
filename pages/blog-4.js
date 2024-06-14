import React, { Component } from "react";
import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";
import PageBanner from "../components/Common/PageBanner";
import BlogGridFullWidth from "../components/Blog/BlogGridFullWidth";
import FacilitySlider from "../components/Common/FacilitySlider";
import InstagramFeed from "../components/Common/InstagramFeed";
import Footer from "../components/Layouts/Footer";

const Blog4 = ({ user, store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Blog Grid (Full Width)"
        homePageUrl="/"
        homePageText="Home"
        activePageText="Blog"
      />
      <BlogGridFullWidth />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Blog4;
