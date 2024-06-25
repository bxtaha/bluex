import React from 'react'
import TopHeader from '../components/Layouts/TopHeader'
import Navbar from '../components/Layouts/Navbar'
import PageBanner from '../components/Common/PageBanner'
import GalleryGrid from '../components/Gallery/GalleryGrid'
import FacilitySlider from '../components/Common/FacilitySlider'
import InstagramFeed from '../components/Common/InstagramFeed'
import Footer from '../components/Layouts/Footer'

const Gallery2 = ({ user, store }) => {
  return (
    <>
      <TopHeader />
      <Navbar />
      <PageBanner
        pageTitle='Gallery Grid (3 in Row)'
        homePageUrl='/'
        homePageText='Home'
        activePageText='Gallery'
      />
      <GalleryGrid />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  )
}

export default Gallery2
