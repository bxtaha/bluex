import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";
import PageBanner from "../components/Common/PageBanner";
import LookbookGrid4 from "../components/Lookbook/LookbookGrid4";
import FacilitySlider from "../components/Common/FacilitySlider";
import InstagramFeed from "../components/Common/InstagramFeed";
import Footer from "../components/Layouts/Footer";

const Lookbook2 = ({ user, store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Lookbook Grid Full Width (4 in Row)"
        homePageUrl="/"
        homePageText="Home"
        activePageText="Lookbook"
      />
      <LookbookGrid4 />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Lookbook2;
