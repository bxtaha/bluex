import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import Banner from '../components/HomeGrocery/Banner';
import CategoryBanner from '../components/HomeGrocery/CategoryBanner';
import Partner from '../components/Common/Partner';
import BlogPost from '../components/HomeGrocery/BlogPost';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';
import RecentProducts from '../components/HomeGrocery/RecentProducts';
import PopularProducts from '../components/HomeGrocery/PopularProducts';
import BestSellingProducts from '../components/HomeGrocery/BestSellingProducts';

import axios from 'axios';
import baseUrl from '../utils/baseUrl';

const Grocery = ({ user, products, store }) => {
  return (
    <div className='grocery-demo'>
      <TopHeader user={user} />

      <Navbar user={user} store={store} />

      <Banner />

      <RecentProducts products={products.slice(19,25)} />

      <CategoryBanner />

      <PopularProducts products={products.slice(19,25)} />

      <Partner />

      <BestSellingProducts products={products.slice(19,25)} />

      <BlogPost />

      <InstagramFeed />
      
      <Footer />
    </div>
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

export default Grocery;
