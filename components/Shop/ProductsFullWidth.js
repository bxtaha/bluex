import React, { useState } from "react";
import SingleProduct from "../Common/SingleProduct";
import QuickViewModal from "../Modals/QuickViewModal";
import ShopSidebar from "./ShopSidebar";
import Pagination from "../Common/Pagination";

const ProductsFullWidth = ({ products, totalPages }) => {
  const [quickModalProduct, setQuickModalProduct] = useState("");
  const [quickModal, setQuickModal] = useState(false);

  const toggleModal = () => {
    setQuickModal(!quickModal);
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-lg-4 col-md-12">
          <ShopSidebar />
        </div>

        <div className="col-lg-8 col-md-12">
          <div className="products-filter-options">
            <div className="row align-items-center">
              <div className="col-lg-8 col-md-8"></div>

              <div className="col-lg-4 col-md-4">
                <p className="text-end">Total 4 Products</p>
              </div>
            </div>
          </div>

          <div id="products-collections-filter" className="row">
            <SingleProduct
              styleCls="col-lg-4 col-md-6 col-sm-6 products-col-item"
              ontoggleModal={toggleModal}
              products={products}
              setQuickModalProduct={setQuickModalProduct}
            />
          </div>

          {/* Quick View Modal */}
          <QuickViewModal
            onClick={toggleModal}
            active={quickModal ? "active" : ""}
            quickModalProduct={quickModalProduct}
          />

          {/* Pagination */}
          <Pagination totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
};

export default ProductsFullWidth;
