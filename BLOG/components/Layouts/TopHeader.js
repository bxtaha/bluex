import React, { useState } from 'react'
import Link from 'next/link'
import WishlistModal from '../Modals/WishlistModal'

const TopHeader = () => {
  const [wishlistModal, setWishlistModal] = useState(false)

  const toggleModalWishlist = () => {
    setWishlistModal(!wishlistModal)
  }

  const user = false

  return (
    <>
      <div className='top-header'>
        <div className='container'>
          <div className='row align-items-center'>
            <div className='col-lg-6 col-md-12'>
              <ul className='header-contact-info'>
                <li>Welcome to BlueX</li>
                <li>Call: +880 1816-417387</li>
              </ul>
            </div>

            <div className='col-lg-6 col-md-12'>
              <ul className='header-top-menu'>
                <li>
                  <Link href='/profile'>
                    <a>
                      <i className='bx bxs-user'></i> My Account
                    </a>
                  </Link>
                </li>

                <li>
                  {user ? (
                    <>
                      <a className='global-pointer'>
                        <i className='bx bx-log-in'></i> Logout
                      </a>
                    </>
                  ) : (
                    <Link href='/login'>
                      <a>
                        <i className='bx bx-log-in'></i> Login
                      </a>
                    </Link>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Wishlist Modal */}
      <WishlistModal
        onClick={toggleModalWishlist}
        active={wishlistModal ? 'active' : ''}
      />
    </>
  )
}

export default TopHeader
