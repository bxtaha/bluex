'use client'

import { ItemImgs } from '@/types/products'
import Image from 'next/image'
import React, { useState } from 'react'

type Props = {
  itemImgs: ItemImgs[]
}

const ImageSection = ({ itemImgs }: Props) => {
  const [selectedImage, setSelectedImage] = useState(itemImgs[0])
  return (
    <div className='p-2'>
      {/* Large Image */}
      <div className=''>
        <Image
          src={selectedImage?.url}
          alt={selectedImage?.alt}
          height={550}
          width={550}
          style={{
            maxHeight: '550px',
            width: '550px',
          }}
        />
      </div>

      {/* Small Images */}
      <div className='mt-2 flex gap-2 '>
        {itemImgs.map((obj) => {
          return (
            <div
              className={`mb-5 cursor-pointer min-h-[60px] min-w-[60px] ${
                obj._id === selectedImage._id && 'ring-2 ring-blue-600 '
              }`}
              onClick={() => setSelectedImage(obj)}
              key={obj._id}
            >
              <Image
                style={{
                  height: '100%',
                  width: '100%',
                }}
                src={obj.url}
                alt={selectedImage?.alt}
                height={60}
                width={60}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ImageSection
