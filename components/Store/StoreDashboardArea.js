import Link from 'next/link';
import formatDate from '../../utils/formatDate'

const StoreDashboardArea = ({store}) => {
  return (
    <>
    { store.status === 'approved' &&    <div className='ui basic segment'>
        <div className='create-new-products-area'>
          <div className='ui card'>
            <div className='image'>
              <img src='https://res.cloudinary.com/dev-empty/image/upload/v1630922586/Untitled-1.png' />
            </div>
            <div className='content'>
              <div className='header'>{store.name}</div>
              <div className='meta'>
                <span className='date'>Created {formatDate(store.createdAt)}</span>
              </div>
              <div className='description'>{store.aboutText}</div>
            </div>
            <div className='extra content'>
              <Link href='/stores/products'>
                <a>
                  <i aria-hidden='true' className='list icon'></i>{store.products.length} Products
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div> }

    </>
  );
};

export default StoreDashboardArea;
