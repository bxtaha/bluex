import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import FaqsContent from '../components/Faqs/FaqsContent';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';

const Faqs = ({ user,store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle='Frequently Asked Question'
        homePageUrl='/'
        homePageText='Home'
        activePageText="FAQ's"
      />

      <FaqsContent />

      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Faqs;
