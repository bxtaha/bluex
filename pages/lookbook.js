import React from 'react'
import TopHeader from '../components/Layouts/TopHeader'
import Navbar from '../components/Layouts/Navbar'
import PageBanner from '../components/Common/PageBanner'
import LookbookGrid from '../components/Lookbook/LookbookGrid'
import FacilitySlider from '../components/Common/FacilitySlider'
import InstagramFeed from '../components/Common/InstagramFeed'
import Footer from '../components/Layouts/Footer'

const Lookbook1 = ({ user, store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle='Lookbook Grid (3 in Row)'
        homePageUrl='/'
        homePageText='Home'
        activePageText='Lookbook'
      />
      <LookbookGrid />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  )
}

export default Lookbook1
