import TopHeaderTwo from '../components/Layouts/TopHeaderTwo';
import NavbarTwo from '../components/Layouts/NavbarTwo';
import Banner from '../components/Covid19/Banner';
import Footer from '../components/Layouts/Footer';
import RecentProducts from '../components/Covid19/RecentProducts';
import OfferArea from '../components/Covid19/OfferArea';
import PopularProducts from '../components/Covid19/PopularProducts';
import FacilitySlider from '../components/Common/FacilitySlider';
import BestSellingProducts from '../components/Covid19/BestSellingProducts';
import ShopByBrand from '../components/Common/ShopByBrand';
import RecentBlogPost from '../components/Covid19/RecentBlogPost';
import InstagramFeed from '../components/Covid19/InstagramFeed';

import axios from 'axios';
import baseUrl from '../utils/baseUrl';

const Covid19 = ({ user, products, store }) => {
  return (
    <>
      <TopHeaderTwo user={user} />

      <NavbarTwo user={user} store={store} />

      <Banner />

      <RecentProducts products={products.slice(12,18)} />

      <OfferArea />

      <PopularProducts products={products.slice(12,18)} />

      <FacilitySlider />

      <BestSellingProducts products={products.slice(12,18)} />

      <ShopByBrand />

      <RecentBlogPost />

      <InstagramFeed />
      
      <Footer />
    </>
  );
};

export async function getServerSideProps(ctx) {
  const page = ctx.query.page ? ctx.query.page : '1';

  const payload = {
    params: {
      page,
      limit: 100,
    },
  };

  const url = `${baseUrl}/api/v1/products`;

  const response = await axios.get(url, payload);
  const { products, totalPages } = response.data;

  return {
    props: {
      products,
      totalPages,
    },
  };
}

export default Covid19;
