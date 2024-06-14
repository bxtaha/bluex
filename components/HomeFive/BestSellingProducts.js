import React, { useState } from 'react';
import QuickViewModal from '../Modals/QuickViewModal';
import SingleProduct from '../Common/SingleProduct';

const BestSellingProducts = ({ products }) => {
  const [quickModal, setQuickModal] = useState(false);
  const [quickModalProduct, setQuickModalProduct] = useState('');

  const toggleModal = () => {
    setQuickModal(!quickModal);
  };

  return (
    <>
      <section className='products-area full-width-area pb-70'>
        <div className='container-fluid'>
          <div className='section-title'>
            <span className='sub-title'>See Our Collection</span>
            <h2>Best Selling Products</h2>
          </div>

          <div className='row justify-content-center'>
            <SingleProduct
              styleCls='col-lg-3 col-sm-6'
              styleClsTwo='products-box'
              ontoggleModal={toggleModal}
              products={products}
              setQuickModalProduct={setQuickModalProduct}
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

export default BestSellingProducts;
