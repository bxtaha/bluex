import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";
import PageBanner from "../components/Common/PageBanner";
import GalleryThreeGridFullWidth from "../components/Gallery/GalleryThreeGridFullWidth";
import FacilitySlider from "../components/Common/FacilitySlider";
import InstagramFeed from "../components/Common/InstagramFeed";
import Footer from "../components/Layouts/Footer";

const Gallery3 = ({ user, store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Gallery Full Width (3 in Row)"
        homePageUrl="/"
        homePageText="Home"
        activePageText="Gallery"
      />
      <GalleryThreeGridFullWidth />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Gallery3;
