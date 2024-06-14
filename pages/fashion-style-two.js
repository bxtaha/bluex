import TopHeaderTwo from '../components/Layouts/TopHeaderTwo';
import NavbarTwo from '../components/Layouts/NavbarTwo';
import Banner from '../components/HomeTwo/Banner';
import Footer from '../components/Layouts/Footer';
import CategoriesBanner from '../components/HomeTwo/CategoriesBanner';
import RecentProducts from '../components/HomeTwo/RecentProducts';
import OfferArea from '../components/HomeTwo/OfferArea';
import PopularProducts from '../components/HomeTwo/PopularProducts';
import FacilitySlider from '../components/Common/FacilitySlider';
import BestSellingProducts from '../components/HomeTwo/BestSellingProducts';
import ShopByBrand from '../components/Common/ShopByBrand';
import RecentBlogPost from '../components/Common/RecentBlogPost';
import InstagramFeed from '../components/Common/InstagramFeed';


import axios from 'axios';
import baseUrl from '../utils/baseUrl';

const HomeTwo = ({user,products,store}) => {
  return (
    <>
      <TopHeaderTwo user={user} />

      <NavbarTwo user={user} store={store} />

      <Banner />

      <CategoriesBanner />

      <RecentProducts products={products.slice(0,6)} />

      <OfferArea />

      <PopularProducts products={products.slice(0,6)} />

      <FacilitySlider />

      <BestSellingProducts products={products.slice(3,9)} />

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
    }
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

export default HomeTwo;
