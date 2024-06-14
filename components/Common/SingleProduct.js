import Link from 'next/link';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useToasts } from 'react-toast-notifications';

const SingleProduct = ({
  ontoggleModal,
  products,
  setQuickModalProduct,
  styleCls,
}) => {
  const dispatch = useDispatch();

  const [quickviewModal, setQuickviewModal] = useState(false);
  const [qty, setQty] = useState(1);
  const { addToast } = useToasts();

  const addToCart = (product) => {
    let productObj = {};
    productObj['id'] = product.id;
    productObj['storeId'] = product.storeId;
    productObj['name'] = product.name;
    productObj['price'] = product.price;
    productObj['image'] = product.productImage;
    productObj['quantity'] = qty;
    dispatch({
      type: 'ADD_TO_CART',
      data: productObj,
    });
    addToast('Added to the cart successfully', {
      appearance: 'success',
    });
    setQty(1);
  };

  const toggleModal = (product) => {
    ontoggleModal(quickviewModal);
    setQuickModalProduct(product);
  };

  return (
    <>
      {products &&
        products.map((product) => (
          <div className={styleCls} key={product.id}>
            <div className='single-products-box'>
              <div className='products-image'>
                <Link href={`/product/${product.id}`}> 
                  <a>
                    <img
                      src={product.productImage[0]}
                      className='main-image'
                      alt='image'
                    />
                    <img
                      src={product.hoverImage}
                      className='hover-image'
                      alt='image'
                    />
                  </a>
                  </Link>

                <div className='products-button'>
                  <ul>
                    <li>
                      <div className='wishlist-btn'>
                        <a href='#'>
                          <i className='bx bx-heart'></i>
                          <span className='tooltip-label'>Add to Wishlist</span>
                        </a>
                      </div>
                    </li>
                    <li>
                      <div className='compare-btn'>
                        <a href='#'>
                          <i className='bx bx-refresh'></i>
                          <span className='tooltip-label'>Compare</span>
                        </a>
                      </div>
                    </li>
                    <li>
                      <div className='quick-view-btn global-pointer'>
                        <a
                          data-bs-toggle='modal'
                          data-bs-target='#productsQuickView'
                          onClick={() => toggleModal(product)}
                        >
                          <i className='bx bx-search-alt'></i>
                          <span className='tooltip-label'>Quick View</span>
                        </a>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div className='products-content'>
                <h3>
                <Link href={`/product/${product.id}`}> 
                  <a>{product.name}</a>
                  </Link>
                </h3>
                <div className='price'>
                  <span className='old-price'>$321</span>
                  <span className='new-price'>${product.price}</span>
                </div>
                <div className='star-rating'>
                  <i className='bx bxs-star'></i>
                  <i className='bx bxs-star'></i>
                  <i className='bx bxs-star'></i>
                  <i className='bx bxs-star'></i>
                  <i className='bx bxs-star'></i>
                </div>
                <a className='add-to-cart' onClick={() => addToCart(product)}>
                  Add to Cart
                </a>
              </div>
            </div>
          </div>
        ))}
    </>
  );
};

export default SingleProduct;
