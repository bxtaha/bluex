import TopHeader from '../components/Layouts/TopHeader'
import Navbar from '../components/Layouts/Navbar'
import FacilitySlider from '../components/Common/FacilitySlider'
import InstagramFeed from '../components/Common/InstagramFeed'
import Footer from '../components/Layouts/Footer'
import PageBanner from '../components/Common/PageBanner'
import BlogWithRightSidebar from '../components/Blog/BlogWithRightSidebar'

const Index = ({ user, store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle='Blog Right Sidebar'
        homePageUrl='/'
        homePageText='Home'
        activePageText='Blog Right Sidebar'
      />
      <BlogWithRightSidebar />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  )
}

export default Index
