import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';
import SignUpForm from '../components/Authentication/SignUpForm';

const Signup = () => {
  return (
    <>
      <TopHeader />
      <Navbar />
      <PageBanner
        pageTitle='My Account'
        homePageUrl='/'
        homePageText='Home'
        activePageText='Login'
      />

      <SignUpForm />

      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Signup;
