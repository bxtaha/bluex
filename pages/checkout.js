import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import CheckoutContent from '../components/Checkout/CheckoutContent';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';
import { useRef } from 'react';

const Checkout =({user,store})=> {
    return (
      <>
        <TopHeader user={useRef}/>
        <Navbar user={user} />
        <PageBanner
          pageTitle='Checkout'
          homePageUrl='/'
          homePageText='Home'
          activePageText='Checkout'
        />
        <CheckoutContent store={store} user={user} />
        <FacilitySlider />
        <InstagramFeed />
        <Footer />
      </>
    );
  }


export default Checkout;
