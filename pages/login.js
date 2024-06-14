import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';
import LoginForm from '../components/Authentication/LoginForm';

const Login = () => {
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

      <LoginForm />

      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Login;
