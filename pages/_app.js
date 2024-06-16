import { useState, useEffect } from 'react'
import { Provider } from 'react-redux'
import { useStore } from '../store'
import { ToastProvider } from 'react-toast-notifications'
import { parseCookies } from 'nookies'

import '../public/scss/bootstrap.min.css'
import '../public/scss/animate.min.css'
import '../public/scss/boxicons.min.css'
import '../public/scss/flaticon.css'
import '../node_modules/slick-carousel/slick/slick.css'
import '../node_modules/slick-carousel/slick/slick-theme.css'
import '../public/scss/styles.css'
import '../public/scss/nprogress.css'
import '../public/scss/responsive.css'
import '../public/scss/dashboard.css'

import GoTop from '../components/Shared/GoTop'
import Loader from '../components/Shared/Loader'

import Router from 'next/router'
import NProgress from 'nprogress'
import Head from 'next/head'

Router.onRouteChangeStart = () => NProgress.start()
Router.onRouteChangeComplete = () => NProgress.done()
Router.onRouteChangeError = () => NProgress.done()

export default function App({ Component, pageProps }) {
  const store = useStore(pageProps.initialReduxState)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 20)
  }, [])

  return (
    <>
      <Head>
        <title>BlueX -Home</title>
        <meta name='viewport' content='initial-scale=1.0, width=device-width' />
      </Head>

      <ToastProvider
        placement='bottom-center'
        autoDismissTimeout={6000}
        autoDismiss
      >
        <Provider store={store}>
          <Component {...pageProps} />
          <Loader loading={loading} />
          <GoTop scrollStepInPx='100' delayInMs='10.50' />
        </Provider>
      </ToastProvider>
    </>
  )
}

App.getInitialProps = async ({ Component, ctx }) => {
  const { livani_token } = parseCookies(ctx)
  let pageProps = {}
  return {
    pageProps,
  }
}
