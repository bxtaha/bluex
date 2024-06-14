import axios from 'axios';
import baseUrl from '../../../utils/baseUrl';
import { useRouter } from 'next/router';
import StoreRequestPagination from '../../Store/StoreRequestPagination';

const options = [
  { key: 'pending', text: 'Pending', value: 'pending' },
  { key: 'approved', text: 'Approved', value: 'approved' },
];

const RequestTable = ({ stores, totalPages }) => {
  const router = useRouter();

  const updateStatus = async (e) => {
    const url = `${baseUrl}/api/v1/store/requests`;
    const payload = { id: e.target.id, status: e.target.value };
    await axios.put(url, payload);
    router.push('/admin/store-requests');
  };
  return (
    <>
      <div className='admin-table admin-orders-table height-555'>
        <div className='table-responsive'>
          <table className='table table-hover mb-0'>
            <thead>
              <tr>
                <th>Action</th>
                <th>Store</th>
                <th>Email</th>

                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td>
                    <select
                      name='cars'
                      id={store.id}
                      className='form-control'
                      onChange={(e) => updateStatus(e)}
                      value={store.status}
                    >
                      {options.map((option) => (
                        <option value={option.value} key={option.key}>
                          {option.text}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{store.name}</td>

                  <td>{store.email}</td>

                  <td>
                    <span
                      className={
                        store.status === 'pending'
                          ? 'status-button badge badge_danger'
                          : 'status-button badge badge_success'
                      }
                    >
                      {store.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <StoreRequestPagination totalPages={totalPages} />
    </>
  );
};

export default RequestTable;
