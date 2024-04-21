import { ChangeEvent, useState } from 'react';
import { AiFillLock } from 'react-icons/ai';
import { BsBoxSeam, BsPinterest } from 'react-icons/bs';
import { CgFacebook } from 'react-icons/cg';
import { FaCartPlus, FaTwitter } from 'react-icons/fa';
// import Ratings from '../common/Ratings';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/redux/features/CartSlice';
import { FcLike } from 'react-icons/fc';
import { addToWishlist } from '@/redux/features/WishlistSlice';

type InfoProps = {
  info: {
    _id: string;
    sku: string;
    name: string;
    price: string;
    stock: number;
    sale: number;
    orginal_price:string;
    // ratings: number;
    shipping: number;
    seller: string;
    category: string | undefined;
    description: string;
    ratingsCount: number;
    images: string;
    props_list: [string];
  };
};

const DetailSection = ({ info }: InfoProps) => {
  const {
    _id,
    name,
    price,
    stock,
    images,
    // ratings,
    seller,
    category,
    // sale,
    orginal_price,
    sku,
    props_list,
    // ratingsCount,
  } = info;

  console.log(info);

  const colors = [];
  const sizes = [];
  const specification = [];

  for (const key in props_list) {
    const [row, col] = key.split(':').map(Number);
    const value = props_list[key];
    console.log(row);
    if (value.startsWith('color:')) {
      if (!colors[col]) colors[col] = value.split(':')[1];
    } else if (value.startsWith('colour:')) {
      if (!colors[col]) colors[col] = value.split(':')[1];
    } else if (value.startsWith('size:')) {
      if (!sizes[col]) sizes[col] = value.split(':')[1];
    } else if (value.startsWith('Specification:')) {
      if (!specification[col]) specification[col] = value.split(':')[1];
    } else if (value.startsWith('Specifications:')) {
      if (!specification[col]) specification[col] = value.split(':')[1];
    }
  }

  // Color
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  //   Size
  const [selectedSize, setSelectedSize] = useState(sizes[0]);
  // Specifications
  const [selectedSpecifications, setSelectedSpecifications] = useState(
    specification[0]
  );

  //   cart count
  const [cartCount, setCartCount] = useState(1);
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value > 1) {
      setCartCount(value);
    }
  };

  const dispatch = useDispatch();
  const addCart = () => {
    dispatch(
      addToCart({
        id: _id,
        name: name,
        image: images,
        price: price,
        quantity: cartCount,
        color: selectedColor,
        size: setSelectedSize,
        specification: selectedSpecifications,
      })
    );
  };

  const addWishList = () => {
    dispatch(
      addToWishlist({
        id: _id,
        name: name,
        image: images,
        price: price,
        quantity: cartCount,
        color: selectedColor,
        size: setSelectedSize,
        specification: selectedSpecifications,
      })
    );
  };

  return (
    <div>
      <h1 className=" py-6 text-2xl font-semibold uppercase text-gray-100">
        {name}
      </h1>

  {
    price ? 
    <h2>
    <span className="px-4 text-lg text-gray-400">
      {' '}
      <del>$ {Number(orginal_price).toFixed(2)}</del>
    </span>
    <span className="text-xl font-semibold text-lime-500 ">
      $ {Number(price).toFixed(2)}
      {/* $ {(Number(price) - (Number(price) * sale) / 100).toFixed(2)} */}
    </span>{' '}
    {/* <span className="bg-blue-600 px-2 py-0.5 text-xs text-gray-100">
      -{sale}%
    </span> */}
  </h2> : 
      <span className="text-xl font-semibold text-lime-500 ">
      $ {Number(orginal_price).toFixed(2)}
      {/* $ {(Number(price) - (Number(price) * sale) / 100).toFixed(2)} */}
    </span>
  }

      {/*-------------------------------------------------------------------------------------- 
                                           Rating Section 
      ---------------------------------------------------------------------------------------*/}
      {/* <div className="mb-8 mt-2 flex items-baseline gap-4">
        <Ratings ratings={ratings} />
        <span className="text-sm text-gray-300">{ratingsCount} reviews</span>
      </div>

      <div className="h-0.5 bg-gray-500"></div> */}

      {/* ------------------------------------------------------------------------------------
                              Add cart and buy now section 
      -------------------------------------------------------------------------------------*/}
      <div className="mt-8">
        {/* Color and Size Section*/}

        {/* Color */}

        {colors?.length > 0 && (
          <div className="mb-4">
            <h3 className="text-gray-200">Color:</h3>
            <div className="mt-2 flex gap-4">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setSelectedColor(c);
                  }}
                  style={{ background: c }}
                  className={`
                   h-6 w-6 ${
                     selectedColor === c && 'ring-4'
                   } rounded-full ring-white`}></button>
              ))}
            </div>
          </div>
        )}

        {/* Size */}
        {sizes?.length > 0 && (
          <div className="mb-10">
            <h3 className="text-gray-200">Size:</h3>
            <div className="mt-2 flex gap-4">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={` rounded-xl border-2 px-2.5 py-0.5 uppercase text-gray-200 ${
                    selectedSize === s ? ' border-blue-600' : 'border-gray-600'
                  } `}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* specifications */}
        {specification?.length > 0 && (
          <div className="mb-10">
            <h3 className="text-gray-200">Specifications:</h3>
            <div className="mt-2">
              <select
                value={selectedSpecifications}
                onChange={(e) => setSelectedSpecifications(e.target.value)}
                className="rounded-xl">
                {specification?.map((s, i) => {
                  return (
                    <option key={i} value={s}>
                      {s}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}

        <div className="my-10 flex max-w-[290px] items-center justify-center rounded-xl border-2 border-gray-300 px-0.5 py-1.5">
          {/* Increase BTN */}
          <button
            className=" px-5 text-3xl text-gray-100"
            onClick={() => setCartCount(cartCount + 1)}>
            +
          </button>
          <input
            onChange={handleInputChange}
            value={cartCount}
            className="w-full border-0 bg-[#17112C]  text-center font-bold text-lime-500 focus:outline-none focus:ring-0 disabled:border"
            type="text"
          />
          {/* Decrease BTN */}
          <button
            className="px-5 text-4xl font-semibold text-gray-100"
            onClick={() => {
              if (cartCount > 1) {
                setCartCount(cartCount - 1);
              }
            }}>
            -
          </button>
        </div>
        <div className="items-center  gap-5 md:flex">
          <button
            onClick={addCart}
            className="my-2  flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#283be5] to-[#0093FF] py-4 font-bold text-gray-100 duration-200 hover:bg-orange-400 md:w-2/5">
            <FaCartPlus size={20} />
            Add to Cart
          </button>
        </div>
        <button
          onClick={addWishList}
          className="my-4 flex items-center justify-start gap-1 py-4 text-gray-200 duration-300 hover:text-blue-500">
          <FcLike size={20} /> <span>Add to wishlist</span>
        </button>

        <p className="text-gray-200">Available Stock: {stock}</p>
      </div>

      {/* ---------------------------------------------------------------------------------------
                                        Some Extra 
      -----------------------------------------------------------------------------*/}

      <div className="my-8 h-0.5 bg-gray-500"></div>
      <div>
        <div className="flex">
          <h3 className="mr-4 text-gray-400">Vendor:</h3>
          <h3 className=" text-gray-100">{seller}</h3>
        </div>
        <div className="flex">
          <h3 className="mr-4 text-gray-400">Type:</h3>
          <h3 className=" text-gray-100">{category}</h3>
        </div>
        <div className="flex">
          <h3 className="mr-4 text-gray-400">Sku:</h3>
          <h3 className=" text-gray-100">{sku}</h3>
        </div>
      </div>

      <div className="my-8 h-0.5 bg-gray-500"></div>

      <div className="text-gray-100">
        <div className="mb-2 flex items-center justify-start gap-4 ">
          <AiFillLock /> Secure payment
        </div>
        {/* <div className="mb-2 flex items-center justify-start gap-4">
          {' '}
          <BsShieldLock /> 2 Year Warranty
        </div>
        <div className="mb-2 ">
          {' '}
          <span className="mr-3">🔥</span>
          30 sold in last 18 hours
        </div> */}
      </div>
      <div className="mb-2 mt-6 flex items-center justify-start gap-4 text-gray-100">
        {' '}
        <BsBoxSeam /> Spend $
        {(Number(price) + (Number(price) * 10) / 100).toFixed(2)} for Free
        Shipping
      </div>

      {/*------------------------------------------------------------------------------------
                                 Social share 
      ---------------------------------------------------------------------------------*/}
      <h2 className="mt-8 font-semibold text-gray-400">Share:</h2>
      <div className="mt-2 flex items-center gap-5 text-gray-100 md:gap-16">
        <button className="flex items-center gap-2">
          <CgFacebook /> Facebook
        </button>
        <button className="flex items-center gap-2">
          <FaTwitter /> Tweet
        </button>
        <button className="flex items-center gap-2">
          {' '}
          <BsPinterest /> Pin it
        </button>
      </div>
    </div>
  );
};

export default DetailSection;
