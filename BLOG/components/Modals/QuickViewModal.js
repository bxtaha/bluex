import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useToasts } from 'react-toast-notifications';


const QuickViewModal = ({ onClick, active, quickModalProduct }) => {

  
  const dispatch = useDispatch();
  const [modal, setModal] = useState(false);
  const [qty, setQty] = useState(1);
  const { addToast } = useToasts();

  const closeModal = () => {
    onClick(modal);
  };

  const addToCart = (product) => {
    let productObj = {};
    productObj['id'] = product.id;
    productObj['name'] = product.name;
    productObj['price'] = product.price;
    productObj['image'] = product.productImage;
    productObj['quantity'] = qty;
    dispatch({
      type: 'ADD_TO_CART',
      data: productObj,
    });
    closeModal();
    addToast('Added to the cart successfully', {
      appearance: 'success',
    });
    setQty(1);
  };

  const increment = () => {
    setQty(qty + 1);
  };

  const decrement = () => {
    setQty(qty - 1);
  };

  return (
    <>
      <div
        className={`modal fade productsQuickView ${active}`}
        id='productsQuickView'
        tabIndex='-1'
        role='dialog'
        aria-hidden='true'
      >
        <div className='modal-dialog modal-dialog-centered' role='document'>
          <div className='modal-content'>
            <button
              type='button'
              className='close'
              data-bs-dismiss='modal'
              aria-label='Close'
              onClick={closeModal}
            >
              <span aria-hidden='true'>
                <i className='bx bx-x'></i>
              </span>
            </button>

            <div className='row align-items-center'>
              <div className='col-lg-6 col-md-6'>
                <div className='products-image'>
                  <img
                    src={quickModalProduct && quickModalProduct.productImage[0]}
                    alt='image'
                  />
                </div>
              </div>

              <div className='col-lg-6 col-md-6'>
                <div className='products-content'>
                  <h3>
                    <a href='#'>
                      {quickModalProduct && quickModalProduct.name}
                    </a>
                  </h3>

                  <div className='price'>
                    <span className='old-price'>$210.00</span>
                    <span className='new-price'>
                      ${quickModalProduct && quickModalProduct.price}.00
                    </span>
                  </div>

                  <div className='products-review'>
                    <div className='rating'>
                      <i className='bx bxs-star'></i>
                      <i className='bx bxs-star'></i>
                      <i className='bx bxs-star'></i>
                      <i className='bx bxs-star'></i>
                      <i className='bx bxs-star'></i>
                    </div>
                    <a href='#' className='rating-count'>
                      3 reviews
                    </a>
                  </div>

                  <ul className='products-info'>
                    <li>
                      <span>Vendor:</span> <a href='#'>Lereve</a>
                    </li>
                    <li>
                      <span>Availability:</span>
                      <a href='#'>In stock (7 items)</a>
                    </li>
                    <li>
                      <span>Products Type:</span>{' '}
                      <a href='#'>
                        {quickModalProduct && quickModalProduct.productType}
                      </a>
                    </li>
                  </ul>

                  <div className='products-color-switch'>
                    <h4>Color:</h4>

                    <ul>
                      <li>
                        <a
                          href='#'
                          data-bs-toggle='tooltip'
                          data-placement='top'
                          title='Black'
                          className='color-black'
                        ></a>
                      </li>
                      <li>
                        <a
                          href='#'
                          data-bs-toggle='tooltip'
                          data-placement='top'
                          title='White'
                          className='color-white'
                        ></a>
                      </li>
                      <li>
                        <a
                          href='#'
                          data-bs-toggle='tooltip'
                          data-placement='top'
                          title='Green'
                          className='color-green'
                        ></a>
                      </li>
                      <li>
                        <a
                          href='#'
                          data-bs-toggle='tooltip'
                          data-placement='top'
                          title='Yellow Green'
                          className='color-yellowgreen'
                        ></a>
                      </li>
                      <li>
                        <a
                          href='#'
                          data-bs-toggle='tooltip'
                          data-placement='top'
                          title='Teal'
                          className='color-teal'
                        ></a>
                      </li>
                    </ul>
                  </div>

                  <div className='products-size-wrapper'>
                    <h4>Size:</h4>

                    <ul>
                      <li>
                        <a href='#'>XS</a>
                      </li>
                      <li className='active'>
                        <a href='#'>S</a>
                      </li>
                      <li>
                        <a href='#'>M</a>
                      </li>
                      <li>
                        <a href='#'>XL</a>
                      </li>
                      <li>
                        <a href='#'>XXL</a>
                      </li>
                    </ul>
                  </div>

                  <div className='products-add-to-cart'>
                    <div className='input-counter'>
                      <span className='minus-btn' onClick={decrement}>
                        <i className='bx bx-minus'></i>
                      </span>
                      <input type='text' value={qty} onChange={(e) => e} />
                      <span className='plus-btn' onClick={increment}>
                        <i className='bx bx-plus'></i>
                      </span>
                    </div>

                    <button
                      type='submit'
                      className='default-btn'
                      onClick={() => addToCart(quickModalProduct)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickViewModal;
