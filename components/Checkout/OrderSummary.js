import { useState } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';

const CheckoutForm = ({ StripeCheckout, handleCheckout, user }) => {
  const cartItems = useSelector((state) => state.cartItems);

  const totalPrice =
    cartItems.length > 0 &&
    cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className='col-lg-6 col-md-12'>
      <div className='order-details'>
        <h3 className='title'>Your Order</h3>

        <div className='order-table table-responsive'>
          <table className='table table-bordered'>
            <thead>
              <tr>
                <th scope='col'>Product Name</th>
                <th scope='col'>Total</th>
              </tr>
            </thead>

            <tbody>
              {cartItems.length > 0 &&
                cartItems.map((cartItem, i) => (
                  <tr key={i}>
                    <td className='product-name'>
                      <a href='#'>{cartItem.name}</a>
                    </td>
                    <td className='product-total'>
                      <span className='subtotal-amount'>
                        ${cartItem.price}.00
                      </span>
                    </td>
                  </tr>
                ))}

              <tr>
                <td className='total-price'>
                  <span>Order Total</span>
                </td>

                <td className='product-subtotal'>
                  {totalPrice > 0 ? (
                    <span className='subtotal-amount'>${totalPrice}.00</span>
                  ) : (
                    <span className='subtotal-amount'>$0</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className='payment-box'>
          <div className='payment-method'>
            <p>
              <input
                type='radio'
                id='direct-bank-transfer'
                name='radio-group'
                value='payment'
                onChange={(e) => e}
              />
              <label>Direct Order</label>
              Make your payment directly into our bank account. Please use your
              Order ID as the payment reference. Your order will not be shipped
              until the funds have cleared in our account.
            </p>
            <p>
              <input
                type='radio'
                id='direct-bank-transfers'
                name='radio-group'
                value='stripe'
                checked
                onChange={(e) => e}
              />
              <label>Stripe</label>
            </p>
          </div>

          {user ? (
            <StripeCheckout
              name='Livani'
              amount={parseInt(totalPrice)}
              currency='USD'
              shippingAddress={true}
              billingAddress={true}
              zipCode={true}
              stripeKey='pk_test_xyteqRGWdKBGpFXHZe3zOelk00t3YAyhHH'
              token={handleCheckout}
              triggerEvent='onClick'
            >
              <button
                className='default-btn'
                onClick={(e) => e.preventDefault()}
              >
                Place Order <span></span>
                <i className='flaticon-right'></i>
              </button>
            </StripeCheckout>
          ) : (
            <Link href='/log-in'>
              <a className='default-btn'>
                Please Login To Complete Your Order
                <i className='flaticon-right'></i>
              </a>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutForm;
