import Image from 'next/image'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

export default function Home() {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const intervalId = setInterval(() => {
      const randomX = Math.random() * (window.innerWidth - 200)
      const randomY = Math.random() * (window.innerHeight - 50)
      setPosition({ x: randomX, y: randomY })
    }, 5000)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.keyCode === 44) {
        toast.error('Error: You are trying SS!')
        e.preventDefault()
      } else if (e.keyCode === 123) {
        toast.error('Error: You are trying Inspect!')
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleContextMenu = (e) => {
    toast.error('Error: Right click off!')
    e.preventDefault()
  }

  return (
    <main
      onContextMenu={handleContextMenu}
      className='flex min-h-screen flex-col items-center justify-between p-24'
    >
      <Head>
        <title>BlueX -home</title>
        <meta name='robots' content='all' />
        <meta name='google' content='nositelinkssearchbox' key='sitelinks' />
        <meta name='google' content='notranslate' key='notranslate' />
      </Head>
      <div className='z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex'>
        <button className='fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30'>
          Welcome by Taha Pixel Added
        </button>
      </div>

      <div className="relative z-[-1] flex place-items-center before:absolute before:h-[300px] before:w-full before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-full after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 sm:before:w-[480px] sm:after:w-[240px] before:lg:h-[360px]">
        <Image
          className='relative'
          src='/abx.png'
          alt='BlueX logo'
          width={350}
          height={80}
          priority
        />
      </div>

      <div className='mb-32 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left'></div>

      <div
        className='absolute'
        style={{ top: position.y, left: position.x, zIndex: 10000 }}
      >
        <h1 className='text-red-500'>taha.iu.bd@gmail.com</h1>
      </div>

      <Toaster />
    </main>
  )
}
