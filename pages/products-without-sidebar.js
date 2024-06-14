import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import ProductsNoSidebar from '../components/Shop/ProductsNoSidebar';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';
import { useRouter } from 'next/router';

import axios from 'axios';
import baseUrl from '../utils/baseUrl';

const ProductsWithoutSidebar = ({ user, products, store, totalPages }) => {
  const router = useRouter();
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Women's"
        homePageUrl='/'
        homePageText='Home'
        activePageText='Products'
      />
      <section className='products-area pt-100 pb-70'>
        {products.length > 0 ? (
          <ProductsNoSidebar products={products} totalPages={totalPages} />
        ) : (
          <p className='empty-search-product'>{router.query.name} is not available</p>
        )}
      </section>
      <FacilitySlider />
      <InstagramFeed />
      <Footer />
    </>
  );
};

export async function getServerSideProps(ctx) {
  const page = ctx.query.page ? ctx.query.page : '1';
  const keyword = ctx.query.name;

  const payload = {
    params: {
      page,
      limit: 9,
      keyword,
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

export default ProductsWithoutSidebar;
