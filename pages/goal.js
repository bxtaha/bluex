import React from 'react'
import TopHeader from '../components/Layouts/TopHeader'
import Navbar from '../components/Layouts/Navbar'
import PageBanner from '../components/Common/PageBanner'
import FacilitySlider from '../components/Common/FacilitySlider'
import InstagramFeed from '../components/Common/InstagramFeed'
import Footer from '../components/Layouts/Footer'
import GoalGrid from '../components/Goal/GoalGrid'

const Goal = () => {
  return (
    <>
      <TopHeader />
      <Navbar />
      <PageBanner
        pageTitle='My Goal'
        homePageUrl='/'
        homePageText='Home'
        activePageText='Goal'
      />
      <GoalGrid />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  )
}

export default Goal
