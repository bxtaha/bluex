import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const OwlCarousel = dynamic(import('react-owl-carousel3'));
import QuickViewModal from '../Modals/QuickViewModal';
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

const TrendingProducts = ({ products }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [display, setDisplay] = useState(false);
  const [quickModal, setQuickModal] = useState(false);
  const [quickModalProduct, setQuickModalProduct] = useState('');

  const toggleModal = () => {
    setQuickModal(!quickModal);
  };

  useEffect(() => {
    setIsMounted(true);
    setDisplay(true);
  }, []);

  useEffect(() => {
    setIsMounted(!false);
  }, []);

  return (
    <>
      <section className='products-area pt-100 pb-70'>
        <div className='container'>
          <div className='section-title text-left'>
            <span className='sub-title'>See Our Collection</span>
            <h2>Trending Products</h2>
            <Link href='/products-right-sidebar'>
              <a className='default-btn'>Shop More</a>
            </Link>
          </div>

          {display ? (
            <OwlCarousel
              className='products-slides owl-carousel owl-theme'
              {...options}
            >
              <SingleProductStyleTwo
                ontoggleModal={toggleModal}
                products={products}
                setQuickModalProduct={setQuickModalProduct}
              />
            </OwlCarousel>
          ) : (
            ''
          )}
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

export default TrendingProducts;
