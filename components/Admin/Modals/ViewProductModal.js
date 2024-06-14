import Link from 'next/link';

const ViewProductModal = ({ viewProductDetail, active, handleViewProduct,handleActiveModal }) => {
  console.log('view', viewProductDetail);
  return (
    <>
      <div
        className={
          active
            ? 'admin-product-modal view-product active'
            : 'admin-product-modal view-product'
        }
      >
        <div className='modal-innter-content'>
          <div className='modal-body'>
            <button type='button' className='close' onClick={handleActiveModal}>
              <span aria-hidden='true'>
                <i className='bx bx-x'></i>
              </span>
            </button>

            <h3>View Product</h3>

            <div className='view-product-content'>
              <div className='row align-items-center'>
                <div className='col-lg-6'>
                  <div className='product-img'>
                    {viewProductDetail && <img
                      src={viewProductDetail.productImage[0]}
                      className='main-image'
                      alt='image'
                    />}



                    {viewProductDetail.onSale === 'true' && (
                      <div className='sale-tag'>Sale!</div>
                    )}

                    {/* <div className="new-tag">New!</div> */}
                    {viewProductDetail.discountPercent && (
                      <span className='discount'>
                        {viewProductDetail.discountPercent}% OFF
                      </span>
                    )}


                  </div>
                </div>

                <div className='col-lg-6'>
                  <div className='products-details-desc'>
                    <h3>{viewProductDetail.name}</h3>
                    <p>{viewProductDetail.description}</p>

                    <div className='price'>
                      {/* <>
                          <span className='old-price'>$100}</span>
                          <span className='new-price'>$200</span>
                        </> */}

                      <span className='new-price'>${viewProductDetail.price}</span>
                    </div>

                    <ul className='products-info'>
                      <li>
                        <span>Availability:</span>
                        <Link href='#'>
                          <a onClick={(e) => e.preventDefault()}>
                            In stock (7 items)
                          </a>
                        </Link>
                      </li>

                    </ul>

                    <ul className='products-info'>
                      <li>
                        <span>Product Categories:</span>
                        <Link href='#'>
                          <a onClick={(e) => e.preventDefault()}>
                            {viewProductDetail.productType}
                          </a>
                        </Link>
                      </li>
                    </ul>
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

export default ViewProductModal;
