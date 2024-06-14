import React, { useState } from 'react';

const SearchModal = ({onClick,active,handleSearch,handleChange}) => {
  const [modal, setModal] = useState(false);

  const closeModal = () => {
    onClick(modal);
  };

  return (
    <div className={`search-overlay ${active}`}>
      <div className='d-table'>
        <div className='d-table-cell'>
          <div className='search-overlay-layer'></div>
          <div className='search-overlay-layer'></div>
          <div className='search-overlay-layer'></div>

          <div className='search-overlay-close' onClick={closeModal}>
            <span className='search-overlay-close-line'></span>
            <span className='search-overlay-close-line'></span>
          </div>

          <div className='search-overlay-form'>
            <form onSubmit={handleSearch}>
              <input
                type='text'
                className='input-search'
                placeholder='Search here...'
                onChange={handleChange}
              />
              <button type='submit'>
                <i className='bx bx-search-alt'></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
