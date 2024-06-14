import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";
import PageBanner from "../components/Common/PageBanner";
import CategoriesFullWidth3Grid from "../components/Categories/CategoriesFullWidth3Grid";
import FacilitySlider from "../components/Common/FacilitySlider";
import InstagramFeed from "../components/Common/InstagramFeed";
import Footer from "../components/Layouts/Footer";

const Categories4 = ({ user,store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Categories Full Width (3 in Row)"
        homePageUrl="/"
        homePageText="Home"
        activePageText="Categories"
      />
      <CategoriesFullWidth3Grid />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Categories4;
