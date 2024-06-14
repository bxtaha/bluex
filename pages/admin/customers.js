import LeftSidebar from '../../components/Admin/LeftSidebar';
import AllCustomers from '../../components/Customers/AllCustomers';

import axios from 'axios';
import baseUrl from '../../utils/baseUrl';

const Customers = ({ user, store, customers, totalPages }) => {
  return (
    <>
      <LeftSidebar user={user} store={store} />

      <div className='admin-main-content d-flex flex-column'>
        <div className='page-header'>
          <h2>Customers</h2>
        </div>

        <AllCustomers customers={customers} totalPages={totalPages} />

        {/* Footer */}
        <div className='flex-grow-1'></div>
      </div>
    </>
  );
};

export async function getServerSideProps(ctx) {

  const page = ctx.query.page ? ctx.query.page : '1';

  const payload = {
    params: {
      page,
      limit: 10,
    },

  };

  const url = `${baseUrl}/api/v1/customers`;

  const response = await axios.get(url, payload);
  const { customers, totalPages } = response.data;

  return {
    props: {
      customers,
      totalPages,
    },
  };
}

export default Customers;
