import TopHeaderTwo from '../components/Layouts/TopHeaderTwo';
import NavbarTwo from '../components/Layouts/NavbarTwo';
import Banner from '../components/HomeFour/Banner';
import Footer from '../components/Layouts/Footer';
import Categories from '../components/HomeFour/Categories';
import RecentProducts from '../components/HomeFour/RecentProducts';
import OfferProducts from '../components/HomeFour/OfferProducts';
import PopularProducts from '../components/HomeFour/PopularProducts';
import FacilitySlider from '../components/Common/FacilitySlider';
import BestSellingProducts from '../components/HomeFour/BestSellingProducts';
import ShopByBrand from '../components/Common/ShopByBrand';
import RecentBlogPost from '../components/Common/RecentBlogPost';
import InstagramFeed from '../components/Common/InstagramFeed';

import axios from 'axios';
import baseUrl from '../utils/baseUrl';

const HomeFour = ({ user, products, store }) => {
  return (
    <>
      <TopHeaderTwo user={user} />

      <NavbarTwo user={user} store={store} />

      <Banner />

      <Categories />

      <RecentProducts products={products.slice(0,6)} />

      <OfferProducts />

      <PopularProducts products={products.slice(0,6)} />

      <FacilitySlider />

      <BestSellingProducts products={products.slice(2,8)} />

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

export default HomeFour;
