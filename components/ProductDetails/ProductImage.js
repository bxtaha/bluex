import { useState } from 'react';


const ProductImage = ({ imageUrl }) => {
  const [index, setIndex] = useState(0);

  return (
    <div className='products-details-image'>
      <ul className='products-details-image-slides'>
        <li>
          { imageUrl &&   <img src={imageUrl[index]} alt='image' />}
         
        </li>
      </ul>


      <div className='product-thumbs'>
        <ul>
          {imageUrl && imageUrl.slice(0,4).map((img, i) => (
            <li key={i}>
              <img src={img} alt='image' onClick={()=>setIndex(i)}/>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

ProductImage.defaultProps = {
  shopImage: [
    {
      id: 1,
      image: '../../images/products/img3.jpg',
    },
    {
      id: 2,
      image: '../../images/products/img4.jpg',
    },
    {
      id: 3,
      image: '../../images/products/img-hover3.jpg',
    },
    {
      id: 4,
      image: '../../images/products/img-hover4.jpg',
    },
    {
      id: 5,
      image: '../../images/products/img7.jpg',
    },
  ],
};

export default ProductImage;
