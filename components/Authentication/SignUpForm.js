import { useState } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { handleLogin } from '../../utils/auth';
import axios from 'axios';
import catchErrors from '../../utils/catchErrors';
import baseUrl from '../../utils/baseUrl';
import Link from 'next/link';

const INITIAL_USER = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const SignUpForm = () => {
  const [user, setUser] = useState(INITIAL_USER);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const onDismiss = () => setError(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const url = `${baseUrl}/api/v1/auth/signup`;
      const payload = { ...user };
      const response = await axios.post(url, payload);
      handleLogin(response.data);
      setLoading(false);

    } catch (error) {
      catchErrors(error, setError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className='signup-area ptb-100'>
        <div className='container'>
          <div className='signup-content'>
            <h2>Create an Account</h2>

            {error ? (
              <Alert
                variant='danger'
                show={error ? true : false}
                onClose={onDismiss}
              >
                {error}
              </Alert>
            ) : (
              ''
            )}

            <form className='signup-form' onSubmit={handleSubmit}>
              <div className='form-group'>
                <label>Name</label>
                <input
                  type='text'
                  className='form-control'
                  id='fname'
                  name='name'
                  value={user.name}
                  onChange={handleChange}
                />
              </div>

              <div className='form-group'>
                <label>Email</label>
                <input
                  type='email'
                  className='form-control'
                  id='name'
                  name='email'
                  value={user.email}
                  onChange={handleChange}
                />
              </div>

              <div className='form-group'>
                <label>Password</label>
                <input
                  type='password'
                  className='form-control'
                  id='password'
                  name='password'
                  value={user.password}
                  onChange={handleChange}
                />
              </div>

              <button type='submit' className='default-btn'>
                Signup
                {loading ? (
                  <Spinner
                    color='success'
                    className='product-spinner'
                    animation='border'
                    size='sm'
                  />
                ) : (
                  ''
                )}
              </button>

              <div className='text-center'>
                <Link href='/'>
                  <a className='return-store'>or Return to Store</a>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default SignUpForm;
