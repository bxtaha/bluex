import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const OwlCarousel = dynamic(import('react-owl-carousel3'));

const options = {
  loop: true,
  nav: false,
  dots: false,
  autoplayHoverPause: true,
  autoplay: true,
  navText: [
    "<i class='flaticon-left'></i>",
    "<i class='flaticon-right-arrow'></i>",
  ],
  responsive: {
    0: {
      items: 2,
    },
    576: {
      items: 4,
    },
    768: {
      items: 4,
    },
    1200: {
      items: 7,
    },
  },
};

const Partner = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [display, setDisplay] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setDisplay(true);
  }, []);

  useEffect(() => {
    setIsMounted(!false);
  }, []);

  return (
    <div className='partner-area ptb-70'>
      <div className='container'>
        <div className='section-title'>
          <h2>Our Partners</h2>
        </div>

        {display ? (
          <OwlCarousel
            className='partner-slides owl-carousel owl-theme'
            {...options}
          >
            <div className='partner-item'>
              <Link href='#'>
                <a>
                  <img src='../images/partner/partner1.png' alt='image' />
                </a>
              </Link>
            </div>

            <div className='partner-item'>
              <Link href='#'>
                <a>
                  <img src='../images/partner/partner2.png' alt='image' />
                </a>
              </Link>
            </div>

            <div className='partner-item'>
              <Link href='#'>
                <a>
                  <img src='../images/partner/partner3.png' alt='image' />
                </a>
              </Link>
            </div>

            <div className='partner-item'>
              <Link href='#'>
                <a>
                  <img src='../images/partner/partner4.png' alt='image' />
                </a>
              </Link>
            </div>

            <div className='partner-item'>
              <Link href='#'>
                <a>
                  <img src='../images/partner/partner5.png' alt='image' />
                </a>
              </Link>
            </div>

            <div className='partner-item'>
              <Link href='#'>
                <a>
                  <img src='../images/partner/partner6.png' alt='image' />
                </a>
              </Link>
            </div>
          </OwlCarousel>
        ) : (
          ''
        )}
      </div>
    </div>
  );
};

export default Partner;
