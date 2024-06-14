import React, { Component } from "react";
import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";
import PageBanner from "../components/Common/PageBanner";
import CompareTable from "../components/Compare/CompareTable";
import FacilitySlider from "../components/Common/FacilitySlider";
import InstagramFeed from "../components/Common/InstagramFeed";
import Footer from "../components/Layouts/Footer";

const Compare = ({ user,store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Compare"
        homePageUrl="/"
        homePageText="Home"
        activePageText="Compare"
      />
      <CompareTable />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Compare;
