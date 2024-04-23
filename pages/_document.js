import Document, { Html, Head, Main, NextScript } from 'next/document'
import { Toaster } from 'react-hot-toast'

class MyDocument extends Document {
  render() {
    return (
      <Html lang='en'>
        <Head>
          {/* Google Tag Manager script */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){
                  w[l]=w[l]||[];
                  w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
                  var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
                  j.async=true;
                  j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
                  f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','GTM-KZWVRNMC');
              `,
            }}
          />
        </Head>
        <body>
          {/* Google Tag Manager (noscript) */}
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=GTM-KZWVRNMC`}
              height='0'
              width='0'
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
          {/* End Google Tag Manager (noscript) */}
          <Main />
          <Toaster position='top-center' reverseOrder={true} />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
