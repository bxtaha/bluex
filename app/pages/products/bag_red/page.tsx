// import DetailSection from '@/components/DetailSection'
import Breadcrumb from '@/components/common/Breadcrumb'
import ImageSection from '@/components/ImageSection'
import ProductDescription from '@/components/ProductDescription'
// import { useRouter } from 'next/router'

const Bag = () => {
  // const router = useRouter()
  // const productID = router.query['product-id']
  // const { data, error, isLoading } = useGetData<Product>(
  //   `${baseURL}/products/${productID}`
  // )

  // if (error)
  //   return (
  //     <div className='text-center text-red-500'>{JSON.stringify(error)}</div>
  //   )
  // if (isLoading) return <Spinner />
  // if (data)

  const images = [
    // { _id: '0', url: '/products/bag_red/bag_red_0.jpeg' },
    { _id: '1', url: '/products/bag_red/bag_red_1.jpg', alt: 'bag' },
    { _id: '5', url: '/products/bag_red/bag_red_5.jpg', alt: 'bag' },
    { _id: '4', url: '/products/bag_red/bag_red_4.jpg', alt: 'bag' },
    { _id: '7', url: '/products/bag_red/bag_red_7.jpg', alt: 'bag' },
    { _id: '2', url: '/products/bag_red/bag_red_2.jpg', alt: 'bag' },
    { _id: '3', url: '/products/bag_red/bag_red_3.jpg', alt: 'bag' },
    // { _id: '6', url: '/products/bag_red/bag_red_6.jpg' },
    { _id: '8', url: '/products/bag_red/bag_red_8.jpg', alt: 'bag' },
  ]
  return (
    <section className='py-20'>
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
            <ProductDescription
              description={
                ' Lorem ipsum dolor sit amet, consectetur adipisicing elit. Minima praesentium fugiat ut tenetur, rem laudantium doloremque quo enim sunt odit nam explicabo veniam nulla quisquam magni voluptas ipsa officiis corrupti corporis itaque nisi. Perferendis sunt quo reiciendis vel dolore quam temporibus magni, qui, numquam dolores distinctio aliquam. Natus ab itaque, animi doloribus laboriosam sit quasi maxime. Unde iure rerum corrupti reiciendis pariatur, id rem eos ad facere architecto voluptatibus consequatur vitae cum voluptate mollitia porro. Deleniti quidem adipisci quo error quia culpa, aperiam exercitationem soluta, molestiae sequi harum cum laudantium, voluptas facere incidunt impedit et perspiciatis facilis asperiores modi dolor.'
              }
            />
          </div>

          {/* Right side or detail section */}
          <div className='md:w-1/2'>
            {/* <DetailSection
              info={{
                _id: '1',
                name: 'bag',
                price: '20',
                orginal_price: '50',
                sale: 50,
                stock: 5,
                sku: '5',
                images: '',
                // ratings: 5,
                shipping: 55,
                description: 'data.description',
                seller: '',
                ratingsCount: 5,
                category: 'data.category',
                props_list: ['data.props_list'],
              }}
            /> */}
          </div>
        </div>
      </div>
    </section>
  )
  // return <p>Something went wrong, try again later.</p>
}

export default Bag
