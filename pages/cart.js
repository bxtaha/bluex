import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import CartTable from '../components/Cart/CartTable';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';

const Cart = ({ user,store }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle='Cart'
        homePageUrl='/'
        homePageText='Home'
        activePageText='Cart'
      />
      <CartTable />
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export default Cart;
