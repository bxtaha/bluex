import React from 'react'
import TopHeader from '../components/Layouts/TopHeader'
import Navbar from '../components/Layouts/Navbar'
import PageBanner from '../components/Common/PageBanner'
import BlogDetailsThree from '../components/BlogDetails/BlogDetailsThree'
import FacilitySlider from '../components/Common/FacilitySlider'
import InstagramFeed from '../components/Common/InstagramFeed'
import Footer from '../components/Layouts/Footer'

const SingleBlog3 = ({ user, store }) => {
  return (
    <>
      <TopHeader />
      <Navbar />
      <PageBanner
        pageTitle='Blog Details'
        homePageUrl='/'
        homePageText='Home'
        activePageText='Blog Details'
      />
      <BlogDetailsThree />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  )
}

export default SingleBlog3
