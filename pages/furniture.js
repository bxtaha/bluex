import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import Banner from '../components/HomeFurniture/Banner';
import CategoryBanner from '../components/HomeFurniture/CategoryBanner';
import Partner from '../components/Common/Partner';
import BlogPost from '../components/HomeFurniture/BlogPost';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';
import RecentProducts from '../components/Shared/RecentProducts';
import axios from 'axios';
import baseUrl from '../utils/baseUrl';

const Furniture = ({ user, products, store }) => {
  return (
    <>
      <TopHeader user={user} />

      <Navbar user={user} store={store} />

      <Banner />
      
      <CategoryBanner />

      <RecentProducts products={products.slice(26,32)} />

      <Partner />

      <BlogPost />

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
  const { products } = response.data;

  return {
    props: {
      products
    },
  };
}

export default Furniture;
