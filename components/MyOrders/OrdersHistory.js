import React, { useState } from 'react';
import formatDate from '../../utils/formatDate';

const OrdersHistory = ({ orders }) => {
  const [clicked, setClicked] = useState(false);

  const toggle = (index) => {
    if (clicked === index) {
      return setClicked(null);
    }
    setClicked(index);
  };

  return (
    <>
      <div className='container'>
        <div className='faq-accordion'>
          <ul className='accordion'>
            {orders.length > 0 &&
              orders.map((order, index) => (
                <li
                  className='accordion-item global-pointer'
                  key={index}
                  onClick={() => toggle(index)}
                >
                  <a className='accordion-title active'>
                    <i className='bx bx-chevron-down'></i>
                    <span className='badge badge_success'>
                      {formatDate(order.createdAt)}
                    </span>
                  </a>

                  {clicked === index && (
                    <div
                      className={
                        clicked === index
                          ? 'show accordion-content'
                          : 'accordion-content'
                      }
                    >
                      <div className='total-price'>
                        <span className='order-total-price'>
                          Total:${order.totalPrice}
                        </span>
                        <span className='order-email-icon'>
                          <span className='envelop-icon'>
                            <i className='bx bx-envelope'></i>
                          </span>
                          <span className='order-email'>{order.email}</span>
                        </span>
                      </div>

                      {order.ordersItem.map((item) => (
                        <div className='order-item-content' key={item.id}>
                          <span className='order-item-image'>
                            <img src={item.image[0]} alt='' />
                          </span>

                          <span>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className='order-delivery'>
                    <p>
                      {order.isDelivered === true ? (
                        <span className='badge badge_success'>delivered</span>
                      ) : (
                        <span className='badge badge_danger'>pending</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </>
  );
};

export default OrdersHistory;
