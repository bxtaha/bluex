import React, { useState } from 'react';
import QuickViewModal from '../Modals/QuickViewModal';
import SingleProduct from '../Common/SingleProduct';

const PopularProducts = ({ products }) => {
  const [quickModal, setQuickModal] = useState(false);
  const [quickModalProduct, setQuickModalProduct] = useState('');

  const toggleModal = () => {
    setQuickModal(!quickModal);
  };

  return (
    <>
      <section className='products-area pt-100 pb-70'>
        <div className='container'>
          <div className='section-title'>
            <span className='sub-title'>See Our Collection</span>
            <h2>Popular Products</h2>
          </div>

          <div className='row justify-content-center'>
            <SingleProduct
              styleCls='col-lg-4 col-sm-6'
              styleClsTwo='products-box'
              ontoggleModal={toggleModal}
              setQuickModalProduct={setQuickModalProduct}
              products={products}
            />
          </div>
        </div>
      </section>

      {/* Quick View Modal */}
      <QuickViewModal
        onClick={toggleModal}
        active={quickModal ? 'active' : ''}
        quickModalProduct={quickModalProduct}
      />
    </>
  );
};

export default PopularProducts;
