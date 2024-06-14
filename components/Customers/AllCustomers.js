import React from 'react';
import Gravatar from 'react-gravatar';
import formatDate from '../../utils/formatDate';
import CustomerPagination from '../../components/Customers/CustomerPagination';

const AllCustomers = ({ customers, totalPages }) => {
  return (
    <>
      <div className='admin-table height-555'>
        <div className='table-responsive'>
          <table className='table table-hover mb-0'>
            <thead>
              <tr>
                <th>Name</th>
                <th>Image</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Updated</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {customers &&
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                    </td>
                    <td>
                      <Gravatar
                        email={customer.email}
                        size={50}
                        rating='pg'
                        default='monsterid'
                      />
                    </td>
                    <td>{customer.email}</td>
                    <td>{formatDate(customer.createdAt)}</td>
                    <td>{formatDate(customer.updatedAt)}</td>
                    <td>
                      {customer.role === 'admin'
                        ? 'Admin'
                        : customer.role === 'super-admin'
                        ? 'Super Admin'
                        : 'customer'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      <CustomerPagination totalPages={totalPages} />
    </>
  );
};

export default AllCustomers;
