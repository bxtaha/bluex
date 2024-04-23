import React from 'react'
import Link from 'next/link'
import { BreadcrumbItem } from '@/types/products'

const Breadcrumb = ({ data }) => {
  return (
    <div className='container mb-12 mt-0 md:mt-16 flex flex-wrap gap-1 mx-auto'>
      {data.map((b) => {
        return (
          <div className='text-gray-100' key={b.id}>
            <Link
              className='text-sm hover:underline hover:text-pink-600 p-4'
              href={b.url}
            >
              {b.name}
            </Link>{' '}
            /
          </div>
        )
      })}
    </div>
  )
}

export default Breadcrumb
