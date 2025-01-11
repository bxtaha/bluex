import React, { useState } from 'react'
import Link from '../../utils/ActiveLink'
import TopNavbar from './TopNavbar'

const LeftSidebar = () => {
  const [layoutCls, setLayoutCls] = useState(false)

  const handleLayoutCls = (e) => {
    setLayoutCls(e)
  }

  return (
    <>
      <TopNavbar onChangeClass={handleLayoutCls} />
      <nav className={`admin-sidebar ${layoutCls ? 'active' : null}`}>
        <ul>
          <li className='nav-item'>
            <Link href='/admin/dashboard' activeClassName='active'>
              <a className='nav-link'>
                <i className='bx bx-home-alt'></i>
                Dashboard
              </a>
            </Link>
          </li>
          <li className='nav-item' title='Coming Soon'>
            <Link href='/admin/add-blogs' activeClassName='active'>
              <a className='nav-link'>
                <i className='bx bx-edit'></i>
                Add New Blog
              </a>
            </Link>
          </li>
          <li className='nav-item' title='Coming Soon'>
            <Link href='/admin/blogs' activeClassName='active'>
              <a className='nav-link'>
                <i className='bx bx-news'></i>
                Blogs
              </a>
            </Link>
          </li>
          <li className='nav-item' title='Coming Soon'>
            <Link href='/admin/categories' activeClassName='active'>
              <a className='nav-link'>
                <i className='bx bx-box'></i> Categories
              </a>
            </Link>
          </li>
        </ul>
      </nav>
    </>
  )
}

export default LeftSidebar
