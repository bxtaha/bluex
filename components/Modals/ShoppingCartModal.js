import React, { useState } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';

const ShoppingCartModal = ({ active, onClick }) => {

  const dispatch = useDispatch();
  const [modal, setModal] = useState(false);

  const cartItems = useSelector((state) => state.cartItems);

  let totalPrice = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const closeModal = () => {
    onClick(modal);
  };

  const removeCartItem = (id) => {
    dispatch({
      type: 'REMOVE_CART_ITEM',
      data: id,
    });
  };

  return (
    <>
      <div
        className={
          active ? 'shoppingCartModal right active' : 'shoppingCartModal right'
        }
      >
        <div className='modal-innter-content'>
          <button type='button' className='close' onClick={closeModal}>
            <span aria-hidden='true'>
              <i className='bx bx-x'></i>
            </span>
          </button>
          {cartItems.length > 0 ? <div className='modal-body'>
            <h3>My Cart ({cartItems.length})</h3>

            {cartItems &&
              cartItems.map((cart) => (
                <div className='products-cart-content' key={cart.id}>
                  <div className='products-cart'>
                    <div className='products-image'>
                      <a href='#'>
                        <img src={cart.image[0]} alt='image' />
                      </a>
                    </div>

                    <div className='products-content'>
                      <h3>
                        <a href='#'>{cart.name}</a>
                      </h3>
                      <span>Blue / XS</span>
                      <div className='products-price'>
                        <span>{cart.quantity}</span>
                        <span>x</span>
                        <span className='price'>${cart.price}.00</span>
                      </div>
                      <a
                        className='remove-btn global-pointer'
                        onClick={() => removeCartItem(cart.id)}
                      >
                        <i className='bx bx-trash'></i>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            <div className='products-cart-subtotal'>
              <span>Subtotal</span>
              <span className='subtotal'>${totalPrice}.00</span>
            </div>

            <div className='products-cart-btn'>
              <Link href='/checkout'>
                <a className='default-btn'>Proceed to Checkout</a>
              </Link>

              <Link href='/cart'>
                <a className='optional-btn'>View Shopping Cart</a>
              </Link>
            </div>
          </div> : <p className="empty-shopping-cart"><i className='bx bxs-cart'></i> No Item Available</p>}


        </div>
      </div>
    </>
  );
};

export default ShoppingCartModal;
