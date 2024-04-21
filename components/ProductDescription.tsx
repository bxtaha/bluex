import React from 'react';

type DescProps = {
  description: string;
};

const ProductDescription = ({ description }: DescProps) => {
  return (
    <>
      <h3 className="mt-16 text-xl font-semibold text-gray-100 ">Description:</h3>
      <div className="mt-3 text-justify text-gray-400">{description}</div>
    </>
  );
};

export default ProductDescription;
