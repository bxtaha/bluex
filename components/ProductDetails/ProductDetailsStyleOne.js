import Link from 'next/link';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useToasts } from 'react-toast-notifications';

import ProductDetailsTab from './ProductDetailsTab';
import RelatedProducts from './RelatedProducts';
import ProductImage from './ProductImage';

const ProductDetailsStyleOne = ({ product, products }) => {

  const dispatch = useDispatch();
  const { addToast } = useToasts();

  const [qty, setQty] = useState(1);

  const [max, setMax] = useState(10);
  const [min, setMin] = useState(1);

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

  const increment = () => {
    setQty(qty + 1);
  };

  const decrement = () => {
    setQty(qty - 1);
  };

  return (
    <section className='product-details-area pt-100 pb-70'>
      <div className='container'>
        <div className='row'>
          <div className='col-lg-5 col-md-12'>
            <ProductImage imageUrl={product.productImage} />
          </div>

          <div className='col-lg-7 col-md-12'>
            <div className='products-details-desc'>
              <h3>{product.name}</h3>

              <div className='price'>
                <>
                { product.offer ?<span className='old-price'>${product.oldPrice}</span>:'' }
                  
                  <span className='new-price'>${product.price}</span>
                </>
              </div>

              <div className='products-review'>
                <div className='rating'>
                  <i className='bx bx-star'></i>
                  <i className='bx bx-star'></i>
                  <i className='bx bx-star'></i>
                  <i className='bx bx-star'></i>
                  <i className='bx bx-star'></i>
                </div>

                <Link href='#'>
                  <a
                    onClick={(e) => e.preventDefault()}
                    className='rating-count'
                  >
                    3 reviews
                  </a>
                </Link>
              </div>

              <ul className='products-info'>

                {product.availability && (
                  <li>
                    <span>Availability:</span>
                    <Link href='#'>
                      <a onClick={(e) => e.preventDefault()}>
                        In stock ({product.availability} items)
                      </a>
                    </Link>
                  </li>
                )}

                <li>
                  <span>Products Type:</span>
                  <Link href='#'>
                    <a onClick={(e) => e.preventDefault()}>
                      {product.productType}
                    </a>
                  </Link>
                </li>
              </ul>

              <div className='products-color-switch'>
                <span>Color:</span>

                <ul>
                  <li>
                    <Link href='#'>
                      <a
                        onClick={(e) => e.preventDefault()}
                        title='Black'
                        className='color-black'
                      ></a>
                    </Link>
                  </li>
                  <li>
                    <Link href='#'>
                      <a
                        onClick={(e) => e.preventDefault()}
                        title='White'
                        className='color-white'
                      ></a>
                    </Link>
                  </li>

                  <li className='active'>
                    <Link href='#'>
                      <a
                        onClick={(e) => e.preventDefault()}
                        title='Green'
                        className='color-green'
                      ></a>
                    </Link>
                  </li>
                  <li>
                    <Link href='#'>
                      <a
                        onClick={(e) => e.preventDefault()}
                        title='Yellow Green'
                        className='color-yellowgreen'
                      ></a>
                    </Link>
                  </li>
                  <li>
                    <Link href='#'>
                      <a
                        onClick={(e) => e.preventDefault()}
                        title='Teal'
                        className='color-teal'
                      ></a>
                    </Link>
                  </li>
                </ul>
              </div>

              <div className='products-size-wrapper'>
                <span>Size:</span>

                <ul>
                  <li>
                    <Link href='#'>
                      <a onClick={(e) => e.preventDefault()}>XS</a>
                    </Link>
                  </li>
                  <li className='active'>
                    <Link href='#'>
                      <a onClick={(e) => e.preventDefault()}>S</a>
                    </Link>
                  </li>
                  <li>
                    <Link href='#'>
                      <a onClick={(e) => e.preventDefault()}>M</a>
                    </Link>
                  </li>
                  <li>
                    <Link href='#'>
                      <a onClick={(e) => e.preventDefault()}>XL</a>
                    </Link>
                  </li>
                  <li>
                    <Link href='#'>
                      <a onClick={(e) => e.preventDefault()}>XXL</a>
                    </Link>
                  </li>
                </ul>
              </div>

              <div className='products-info-btn'>
                <Link href='#'>
                  <a
                    onClick={(e) => e.preventDefault()}
                    data-toggle='modal'
                    data-target='#sizeGuideModal'
                  >
                    <i className='bx bx-crop'></i>
                    Size guide
                  </a>
                </Link>

                <Link href='#'>
                  <a
                    onClick={(e) => e.preventDefault()}
                    data-toggle='modal'
                    data-target='#productsShippingModal'
                  >
                    <i className='bx bxs-truck'></i>
                    Shipping
                  </a>
                </Link>

                <Link href='/contact'>
                  <a onClick={(e) => e.preventDefault()}>
                    <i className='bx bx-envelope'></i>
                    Ask about this products
                  </a>
                </Link>
              </div>

              <div className='products-add-to-cart'>
                <div className='input-counter'>
                  <span className='minus-btn' onClick={decrement}>
                    <i className='bx bx-minus'></i>
                  </span>

                  <input
                    type='text'
                    value={qty}
                    min={min}
                    max={max}
                    onChange={(e) => e}
                  />

                  <span className='plus-btn' onClick={increment}>
                    <i className='bx bx-plus'></i>
                  </span>
                </div>

                <button
                  className='default-btn'
                  onClick={() => addToCart(product)}
                >
                  <i className='fas fa-cart-plus'></i>
                  Add to Cart
                </button>
              </div>

              <div className='wishlist-compare-btn'>
                <Link href='#'>
                  <a
                    onClick={(e) => e.preventDefault()}
                    className='optional-btn'
                  >
                    <i className='bx bx-heart'></i>
                    Add to Wishlist
                  </a>
                </Link>

                <Link href='#'>
                  <a
                    onClick={(e) => e.preventDefault()}
                    className='optional-btn'
                  >
                    <i className='bx bx-refresh'></i>
                    Add to Compare
                  </a>
                </Link>
              </div>

              <div className='buy-checkbox-btn'>
                <div className='item'>
                  <input className='inp-cbx' id='cbx' type='checkbox' />
                  <label className='cbx' htmlFor='cbx'>
                    <span>
                      <svg width='12px' height='10px' viewBox='0 0 12 10'>
                        <polyline points='1.5 6 4.5 9 10.5 1'></polyline>
                      </svg>
                    </span>
                    <span>I agree with the terms and conditions</span>
                  </label>
                </div>

                <div className='item'>
                  <Link href='#'>
                    <a
                      onClick={() => addToCart(product)}
                      className='default-btn'
                    >
                      Buy it now!
                    </a>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tab */}
        <ProductDetailsTab />
      </div>

      {/* Related Products */}
      <RelatedProducts products={products} />
    </section>
  );
};

export default ProductDetailsStyleOne;
