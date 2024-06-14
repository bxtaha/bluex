import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import CategoriesOneGrid from '../components/Categories/CategoriesOneGrid';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';

const Categories3 = ({ user,store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle='Categories One Row'
        homePageUrl='/'
        homePageText='Home'
        activePageText='Categories'
      />
      <CategoriesOneGrid />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Categories3;
