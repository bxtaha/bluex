import React from 'react'
import TopHeader from '../components/Layouts/TopHeader'
import Navbar from '../components/Layouts/Navbar'
import PageBanner from '../components/Common/PageBanner'
import CategoriesTwo from '../components/Categories/CategoriesTwo'
import FacilitySlider from '../components/Common/FacilitySlider'
import InstagramFeed from '../components/Common/InstagramFeed'
import Footer from '../components/Layouts/Footer'

const Categories = () => {
  return (
    <>
      <TopHeader />
      <Navbar />
      <PageBanner
        pageTitle='Categories (2 in Row)'
        homePageUrl='/'
        homePageText='Home'
        activePageText='Categories'
      />
      <CategoriesTwo />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  )
}

export default Categories
