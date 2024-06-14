import React, { useState } from 'react';
import QuickViewModal from '../Modals/QuickViewModal';
import SingleProduct from '../Common/SingleProduct';

const RecentProducts = ({ products }) => {
  const [quickModal, setQuickModal] = useState(false);
  const [quickModalProduct, setQuickModalProduct] = useState('');


  const toggleModal = () => {
    setQuickModal(!quickModal);
  };

  return (
    <>
      <section className='products-area pb-70'>
        <div className='container'>
          <div className='section-title'>
            <span className='sub-title'>See Our Collection</span>
            <h2>Recent Products</h2>
          </div>

          <div className='row'>
            <SingleProduct
              styleCls='col-lg-4 col-sm-6'
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

export default RecentProducts;
