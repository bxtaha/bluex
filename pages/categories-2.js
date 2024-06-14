import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import CategoriesFullWidth from '../components/Categories/CategoriesFullWidth';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';

const Categories2 = ({ user,store }) => {

  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle='Categories Full Width'
        homePageUrl='/'
        homePageText='Home'
        activePageText='Categories'
      />
      <CategoriesFullWidth />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Categories2;
