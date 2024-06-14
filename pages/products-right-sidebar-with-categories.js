import TopHeader from '../components/Layouts/TopHeader';
import Navbar from '../components/Layouts/Navbar';
import PageBanner from '../components/Common/PageBanner';
import ProductsWithRightSidebar from '../components/Shop/ProductsWithRightSidebar';
import FacilitySlider from '../components/Common/FacilitySlider';
import InstagramFeed from '../components/Common/InstagramFeed';
import Footer from '../components/Layouts/Footer';
import Category from '../components/Common/Category';

import axios from 'axios';
import baseUrl from '../utils/baseUrl';

const ProductsRightSidebarWithCategories = ({ user, products, store, totalPages }) => {
  return (
    <>
      <TopHeader user={user} />
      <Navbar user={user} store={store} />
      <PageBanner
        pageTitle="Men's"
        homePageUrl='/'
        homePageText='Home'
        activePageText='Products'
      />
      <Category />
      <section className='products-area pb-70'>
        <ProductsWithRightSidebar products={products} totalPages={totalPages} />
      </section>
      <FacilitySlider />
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
      limit: 10,
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

export default ProductsRightSidebarWithCategories;
