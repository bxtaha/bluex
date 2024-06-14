import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import Footer from '../components/Layouts/Footer';
import Banner from '../components/HomeThree/Banner';
import RecentProducts from '../components/HomeThree/RecentProducts';
import FacilitySliderTwo from '../components/Common/FacilitySliderTwo';
import TrendingProducts from '../components/HomeThree/TrendingProducts';
import Categories from '../components/HomeThree/Categories';
import BestSellerProducts from '../components/HomeThree/BestSellerProducts';
import ShopByBrandTwo from '../components/Common/ShopByBrandTwo';
import RecentBlogPost from '../components/Common/RecentBlogPost';

import axios from 'axios';
import baseUrl from '../utils/baseUrl';

const HomeThree = ({ user, products, store }) => {
  return (
    <>
      <TopHeader user={user} />

      <Navbar user={user} store={store} />

      <Banner />

      <section className='all-products-area ptb-100 bg-f5f5f5'>
        <div className='container'>
          <RecentProducts products={products.slice(0, 6)} />

          <FacilitySliderTwo />

          <TrendingProducts products={products.slice(0, 6)} />

          <Categories />

          <BestSellerProducts products={products.slice(2,8)}/>
          
          <ShopByBrandTwo />
        </div>
      </section>

      <RecentBlogPost />

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

export default HomeThree;
