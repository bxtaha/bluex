import React from 'react'
const Toast = ({ t, m }) => {
  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
    >
      <div className='flex-1 w-0 p-4'>
        <div className='flex items-start'>
          <div className='flex-shrink-0 pt-0.5'>
            <img className='h-10 w-10 ' src='/danger.png' alt='' />
          </div>
          <div className='ml-3 flex-1'>
            <p className='text-sm font-medium text-red-600'>{m}</p>
            <p className='mt-1 text-sm text-gray-500'>
              Your account will be blocked, be don&apos;t try again!!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Toast
