import React, { useState } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { useToasts } from 'react-toast-notifications';

const CartTable = () => {
  const dispatch = useDispatch();
  const { addToast } = useToasts();
  const [count, setCount] = useState('');
  const cartItems = useSelector((state) => state.cartItems);

  let totalPrice = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const updateQuantity = (cartItem, i) => {
    let currentItem = {
      id: cartItem.id,
      name: cartItem.name,
      price: cartItem.price,
      image: cartItem.image,
    };
    dispatch({
      type: 'ADD_TO_CART',
      data: currentItem,
    });
    setCount(i);
  };

  const decreaseQuantity = (cartItem, i) => {
    let currentItem = {
      id: cartItem.id,
      name: cartItem.name,
      price: cartItem.price,
      image: cartItem.image,
    };
    dispatch({
      type: 'DECREASE_PRODUCT_QUANTITY',
      data: currentItem,
    });
    setCount(i);
  };

  const removeCartItem = (id) => {
    dispatch({
      type: 'REMOVE_CART_ITEM',
      data: id,
    });
    addToast('Remove Cart Item successfully', {
      appearance: 'success',
    });
  };
  return (
    <section className='cart-area ptb-100'>
      <div className='container'>
        { cartItems.length > 0      ?   <form>
          <div className='cart-table table-responsive'>
            <table className='table table-bordered'>
              <thead>
                <tr>
                  <th scope='col'>Product</th>
                  <th scope='col'>Name</th>
                  <th scope='col'>Unit Price</th>
                  <th scope='col'>Quantity</th>
                  <th scope='col'>Total</th>
                </tr>
              </thead>

              <tbody>
                {cartItems &&
                  cartItems.map((cart, i) => (
                    <tr key={i}>
                      <td className='product-thumbnail'>
                        <a href='#'>
                          <img src={cart.image[0]} alt='item' />
                        </a>
                      </td>

                      <td className='product-name'>
                        <a href='#'>{cart.name}</a>
                      </td>

                      <td className='product-price'>
                        <span className='unit-amount'>${cart.price}.00</span>
                      </td>

                      <td className='product-quantity'>
                        <div className='input-counter'>
                          <span
                            className='minus-btn'
                            onClick={() =>
                              decreaseQuantity(
                                cart,
                                parseInt(cart.quantity - 1),
                                i
                              )
                            }
                          >
                            <i className='bx bx-minus'></i>
                          </span>
                          <input
                            type='text'
                            min='1'
                            value={cart.quantity}
                            onChange={(e) => e}
                          />
                          <span
                            className='plus-btn'
                            onClick={() =>
                              updateQuantity(
                                cart,
                                parseInt(cart.quantity + 1),
                                i
                              )
                            }
                          >
                            <i className='bx bx-plus'></i>
                          </span>
                        </div>
                      </td>

                      <td className='product-subtotal'>
                        <span className='subtotal-amount'>
                          ${cart.price * cart.quantity}.00
                        </span>

                        <a
                          className='remove global-pointer'
                          onClick={() => removeCartItem(cart.id)}
                        >
                          <i className='bx bx-trash'></i>
                        </a>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className='cart-buttons'>
            <div className='row align-items-center'>
              <div className='col-lg-6 col-md-6'>
                <Link href='/products-without-sidebar'>
                  <a className='optional-btn'>Continue Shopping</a>
                </Link>
              </div>

              <div className='col-lg-6 col-md-6'>
                <div className='cart-totals'>
                  <h3>Cart Totals</h3>

                  <ul>
                    <li>
                      Subtotal <span>${totalPrice}.00</span>
                    </li>
                    <li>
                      Shipping <span>$30.00</span>
                    </li>
                    <li>
                      Total <span>${totalPrice + 30}.00</span>
                    </li>
                  </ul>

                  <Link href='/checkout'>
                    <a className='default-btn'>Proceed to Checkout</a>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>  : <p className="empty-store"> <i class='bx bxs-cart'></i> No Cart items Available </p> }

      </div>
    </section>
  );
};

export default CartTable;
