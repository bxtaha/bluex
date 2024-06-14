import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import MenWomensApparelSizing from '../components/SizingGuide/MenWomensApparelSizing';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';

const SizingGuide = ({ user,store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle='Sizing Guide'
        homePageUrl='/'
        homePageText='Home'
        activePageText='Sizing Guide'
      />
      <MenWomensApparelSizing />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default SizingGuide;
