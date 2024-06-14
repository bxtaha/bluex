import React, { Component } from 'react';

const OrderUpdateModal = ({active}) => {
  return (
    <>
      <div className={`admin-product-modal ${active}`}>
        <div className='modal-innter-content'>
          <div className='modal-body'>
            <button type='button' className='close'>
              <span aria-hidden='true'>
                <i className='bx bx-x'></i>
              </span>
            </button>

            <h3>Order Update</h3>

            <form>
              <div className='form-group'>
                <label>Order Status</label>
                <select className='form-control' id='product-type'>
                  <option>Select Option</option>
                  <option value='delivered'>Delivered</option>
                  <option value='pending'>Pending</option>
                  <option value='cancel'>Declined</option>
                </select>
              </div>

              <div className='modal-btn'>
                <div className='btn optional-btn float-left'>Cancel</div>
                <button className='btn default-btn float-right'>Update</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderUpdateModal;
