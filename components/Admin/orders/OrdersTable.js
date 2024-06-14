import axios from 'axios';
import baseUrl from '../../../utils/baseUrl';
import OrderUpdateModal from '../Modals/OrderUpdateModal';
import formatDate from '../../../utils/formatDate';
import { useRouter } from 'next/router';

const OrdersTable = ({ orders, totalPages }) => {
  const router = useRouter();

  const deliverHandler = async (e) => {
    let id = e.target.id;
    await axios.put(`${baseUrl}/api/v1/orders/${id}`);
    router.push('/admin/orders');
  };

  return (
    <>
      <div className='page-header'>
        <h2>Orders</h2>
      </div>

      <div className='admin-table admin-orders-table height-555'>
        <div className='table-responsive'>
          <table className='table table-hover mb-0'>
            <thead>
              <tr>
                <th>Action</th>
                <th>Customer Email</th>
                <th>Date</th>
                <th>Delivery Address</th>
                <th>Amount</th>
                <th>Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <label className='switch'>
                      <input
                        type='checkbox'
                        id={order.id}
                        checked={order.isDelivered}
                        onChange={deliverHandler}
                      />
                      <span className='slider round'></span>
                    </label>
                  </td>

                  <td>
                    <strong>{order.email}</strong>
                  </td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{order.address}</td>
                  <td>${order.totalPrice}</td>

                  <td>{order.phone}</td>
                  <td>
                    <span
                      className={
                        order.isDelivered === true
                          ? 'status-button badge badge_success'
                          : 'status-button badge  badge_danger'
                      }
                    >
                      {order.isDelivered === true ? 'delivered' : 'pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OrderUpdateModal />

      {/* Footer */}
      <div className='flex-grow-1'></div>
    </>
  );
};

export default OrdersTable;
