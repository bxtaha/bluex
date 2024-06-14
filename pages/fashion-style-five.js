import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';
import Banner from '../components/HomeFive/Banner';
import Categories from '../components/HomeFive/Categories';
import RecentProducts from '../components/HomeFive/RecentProducts';
import Offer from '../components/HomeFive/Offer';
import PopularProducts from '../components/HomeFive/PopularProducts';
import FacilitySlider from '../components/Common/FacilitySlider';
import BestSellingProducts from '../components/HomeFive/BestSellingProducts';
import Partner from '../components/Common/Partner';
import RecentBlogPost from '../components/Common/RecentBlogPost';

import axios from 'axios';
import baseUrl from '../utils/baseUrl';

const HomeFive = ({ user, products, store }) => {
  return (
    <>
      <TopHeader user={user} />

      <Navbar user={user} store={store} />

      <Banner />

      <Categories />

      <RecentProducts products={products.slice(0, 8)} />

      <Offer />

      <PopularProducts products={products.slice(0, 8)} />

      <FacilitySlider />

      <BestSellingProducts products={products.slice(0, 8)} />

      <Partner />

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

export default HomeFive;
