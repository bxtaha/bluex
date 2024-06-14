import TopHeader from "../components/Layouts/TopHeader";
import Navbar from "../components/Layouts/Navbar";
import PageBanner from "../components/Common/PageBanner";
import GalleryGridTwo from "../components/Gallery/GalleryGridTwo";
import FacilitySlider from "../components/Common/FacilitySlider";
import InstagramFeed from "../components/Common/InstagramFeed";
import Footer from "../components/Layouts/Footer";

const Gallery1 = ({ user, store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Gallery Grid (2 in Row)"
        homePageUrl="/"
        homePageText="Home"
        activePageText="Gallery"
      />
      <GalleryGridTwo />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Gallery1;
