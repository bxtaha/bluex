import Breadcrumb from "@/components/common/Breadcrumb"
import DetailSection from "@/components/DetailSection"
import ImageSection from "@/components/ImageSection"
import ProductDescription from "@/components/ProductDescription"
import Head from "next/head"


const images = [
  { _id: '1', url: '/products/bag_red/bag_red_1.jpg', alt: 'bag' },
  { _id: '5', url: '/products/bag_red/bag_red_5.jpg', alt: 'bag' },
  { _id: '4', url: '/products/bag_red/bag_red_4.jpg', alt: 'bag' },
  { _id: '7', url: '/products/bag_red/bag_red_7.jpg', alt: 'bag' },
  { _id: '2', url: '/products/bag_red/bag_red_2.jpg', alt: 'bag' },
  { _id: '3', url: '/products/bag_red/bag_red_3.jpg', alt: 'bag' },
  { _id: '8', url: '/products/bag_red/bag_red_8.jpg', alt: 'bag' },
]

const product_description =
  ' Lorem ipsum dolor sit amet, consectetur adipisicing elit. Minima praesentium fugiat ut tenetur, rem laudantium doloremque quo enim sunt odit nam explicabo veniam nulla quisquam magni voluptas ipsa officiis corrupti corporis itaque nisi. Perferendis sunt quo reiciendis vel dolore quam temporibus magni, qui, numquam dolores distinctio aliquam. Natus ab itaque, animi doloribus laboriosam sit quasi maxime. Unde iure rerum corrupti reiciendis pariatur, id rem eos ad facere architecto voluptatibus consequatur vitae cum voluptate mollitia porro. Deleniti quidem adipisci quo error quia culpa, aperiam exercitationem soluta, molestiae sequi harum cum laudantium, voluptas facere incidunt impedit et perspiciatis facilis asperiores modi dolor.'
const Bag = () => {
  return (
    <section className='py-20'>
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){
                w[l]=w[l]||[];
                w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
                var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
                j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
                f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-KZWVRNMC');
            `,
          }}
        />
      </Head>
      <div className='container mx-auto'>
        <Breadcrumb
          data={[
            {
              id: 1,
              name: 'Products',
              url: '#',
            },
            {
              id: 2,
              name: 'Bags',
              url: '#',
            },
            {
              id: 3,
              name: 'Red bag',
              url: '#',
            },
          ]}
        />
        <div className=' justify-between gap-20 md:flex'>
          {/* left side */}
          <div className='md:w-1/2'>
            {/* Img section  */}
            <ImageSection itemImgs={images} />

            {/* Description section */}
            <ProductDescription description={product_description} />
          </div>

          {/* Right side or detail section */}
          <div className='md:w-1/2'>
            <DetailSection
              info={{
                _id: '1',
                name: 'Hello Jayed make a very good title ',
                price: '20',
                orginal_price: '50',
                sale: 50,
                stock: 5,
                sku: '5',
                images: '',
                ratings: 5,
                shipping: 55,
                description: 'data.description',
                seller: '',
                ratingsCount: 5,
                category: 'data.category',
                props_list: ['data.props_list'],
              }}
            />
          </div>
        </div>
      </div>
      
    </section>
  )
}

export default Bag
