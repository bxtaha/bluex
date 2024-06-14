import Link from 'next/link';
import { useRouter } from 'next/router';

const ListingPagination = ({ totalPages }) => {
  const router = useRouter();
  let page = parseInt(router.query.page) ? parseInt(router.query.page) : 1;

  return (
    <>
      <div className='pagination-area text-center'>
        <Link href={`/admin/customers/?page=${page - 1}`}>
          <a
            className={
              page === 1 ? 'isDisabled prev page-numbers' : 'prev page-numbers'
            }
          >
            <i className='bx bx-chevrons-left'></i>
          </a>
        </Link>

        {[...Array(totalPages).keys()].map((x) => (
          <span key={x + 1}>
            <Link href={`/admin/customers?page=${x + 1}`}>
              <a
                className={
                  x + 1 === parseInt(router.query.page)
                    ? 'current page-numbers'
                    : 'page-numbers'
                }
              >
                {x + 1}
              </a>
            </Link>
          </span>
        ))}

        <Link href={`/admin/customers/?page=${page + 1}`}>
          <a
            className={
              page === totalPages
                ? 'isDisabled next page-numbers'
                : 'next page-numbers'
            }
          >
            <i className='bx bx-chevrons-right'></i>
          </a>
        </Link>
      </div>
    </>
  );
};

export default ListingPagination;
