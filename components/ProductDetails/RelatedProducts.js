import React, { useState,useEffect } from 'react';
import dynamic from 'next/dynamic';
const OwlCarousel = dynamic(import('react-owl-carousel3'));
import QuickViewModal from '../Modals/QuickViewModal';
import { useDispatch } from 'react-redux';
import { useToasts } from 'react-toast-notifications';

import SingleProductStyleTwo from '../Common/SingleProductStyleTwo';

const options = {
  loop: true,
  nav: true,
  dots: false,
  autoplayHoverPause: true,
  autoplay: true,
  margin: 30,
  navText: [
    "<i class='flaticon-left'></i>",
    "<i class='flaticon-right-arrow'></i>",
  ],
  responsive: {
    0: {
      items: 1,
    },
    576: {
      items: 2,
    },
    768: {
      items: 2,
    },
    1200: {
      items: 3,
    },
  },
};

const RelatedProducts = ({products}) => {
  const dispatch = useDispatch();
  const { addToast } = useToasts();

  const [quickModal, setQuickModal] = useState(false);
  const [quickModalProduct, setQuickModalProduct] = useState('');

  const toggleModal = () => {
    setQuickModal(!quickModal);
  };

  const [display, setDisplay] = useState(false);
  const [isMounted, setisMounted] = useState(false);

  useEffect(() => {
    setisMounted(true);
    setDisplay(true);
  }, []);


  return (
    <div className='related-products'>
      <div className='container'>
        <div className='section-title'>
          <span className='sub-title'>Our Shop</span>
          <h2>Related Products</h2>
        </div>

        {display ? (
          <OwlCarousel
            className='products-slides owl-carousel owl-theme'
            {...options}
          >
            {products.slice(0, 6).map((product, idx) => (
              <SingleProductStyleTwo
              ontoggleModal={toggleModal}
              products={products}
              setQuickModalProduct={setQuickModalProduct}
              />
            ))}
          </OwlCarousel>
        ) : (
          ''
        )}
        {/* Quick View Modal */}
      <QuickViewModal
        onClick={toggleModal}
        active={quickModal ? 'active' : ''}
        quickModalProduct={quickModalProduct}
      />
      </div>
    </div>
  );
};

export default RelatedProducts;
